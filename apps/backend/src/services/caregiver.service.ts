import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { CaregiverPermission, CaregiverStatus } from '@medication-reminder/shared-types';
import { AppDataSource } from '../database/data-source';
import { CaregiverAccessEntity } from '../models/entities/Caregiver.entity';
import { UserEntity } from '../models/entities/User.entity';
import { notificationService, NOTIFICATION_TEMPLATES } from './notification.service';
import { logger } from '../utils/logger';

export interface InviteCaregiverInput {
  patientId: string;
  caregiverEmail: string;
  permissions: CaregiverPermission[];
  relationship?: string;
  notifyOnMissed?: boolean;
  notifyOnCritical?: boolean;
  notifyOnLowSupply?: boolean;
}

export interface CaregiverNotificationSettings {
  notifyOnMissed: boolean;
  notifyOnCritical: boolean;
  notifyOnLowSupply: boolean;
  missedDoseThreshold: number;
}

export class CaregiverService {
  private caregiverRepo: Repository<CaregiverAccessEntity>;
  private userRepo: Repository<UserEntity>;

  constructor() {
    this.caregiverRepo = AppDataSource.getRepository(CaregiverAccessEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);
  }

  async inviteCaregiver(input: InviteCaregiverInput): Promise<CaregiverAccessEntity> {
    // Find or create caregiver user
    let caregiver = await this.userRepo.findOne({
      where: { email: input.caregiverEmail },
    });

    if (!caregiver) {
      // Create placeholder user for invitation
      caregiver = this.userRepo.create({
        email: input.caregiverEmail,
        passwordHash: '', // Will be set when they accept
        firstName: '',
        lastName: '',
        isActive: false,
      });
      await this.userRepo.save(caregiver);
    }

    // Check if access already exists
    const existing = await this.caregiverRepo.findOne({
      where: {
        patientId: input.patientId,
        caregiverId: caregiver.id,
      },
    });

    if (existing && existing.status === CaregiverStatus.ACTIVE) {
      throw new Error('Caregiver access already exists');
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const access = existing || this.caregiverRepo.create({
      patientId: input.patientId,
      caregiverId: caregiver.id,
    });

    access.status = CaregiverStatus.PENDING;
    access.invitationToken = invitationToken;
    access.invitationExpiresAt = invitationExpiresAt;
    access.relationship = input.relationship || null;
    access.notifyOnMissed = input.notifyOnMissed ?? true;
    access.notifyOnCritical = input.notifyOnCritical ?? true;
    access.notifyOnLowSupply = input.notifyOnLowSupply ?? false;
    access.setPermissions(input.permissions);

    await this.caregiverRepo.save(access);

    logger.info(`Caregiver invitation sent to ${input.caregiverEmail} for patient ${input.patientId}`);
    return access;
  }

  async acceptInvitation(token: string, caregiverId: string): Promise<CaregiverAccessEntity> {
    const access = await this.caregiverRepo.findOne({
      where: { invitationToken: token },
    });

    if (!access) {
      throw new Error('Invalid invitation token');
    }

    if (access.isExpired()) {
      throw new Error('Invitation has expired');
    }

    if (access.caregiverId !== caregiverId) {
      throw new Error('Invitation is for a different user');
    }

    access.status = CaregiverStatus.ACTIVE;
    access.acceptedAt = new Date();
    access.invitationToken = null;
    access.invitationExpiresAt = null;

    await this.caregiverRepo.save(access);

    logger.info(`Caregiver ${caregiverId} accepted invitation for patient ${access.patientId}`);
    return access;
  }

  async revokeAccess(
    patientId: string,
    caregiverId: string,
    revokedBy: string
  ): Promise<CaregiverAccessEntity | null> {
    const access = await this.caregiverRepo.findOne({
      where: { patientId, caregiverId },
    });

    if (!access) {
      return null;
    }

    access.status = CaregiverStatus.REVOKED;
    access.revokedAt = new Date();
    access.revokedBy = revokedBy;

    await this.caregiverRepo.save(access);

    logger.info(`Caregiver access revoked: ${caregiverId} from patient ${patientId}`);
    return access;
  }

  async getCaregiversForPatient(patientId: string): Promise<CaregiverAccessEntity[]> {
    return this.caregiverRepo.find({
      where: { patientId },
      relations: ['caregiver'],
    });
  }

  async getPatientsForCaregiver(caregiverId: string): Promise<CaregiverAccessEntity[]> {
    return this.caregiverRepo.find({
      where: { caregiverId, status: CaregiverStatus.ACTIVE },
      relations: ['patient'],
    });
  }

  async getAccess(patientId: string, caregiverId: string): Promise<CaregiverAccessEntity | null> {
    return this.caregiverRepo.findOne({
      where: { patientId, caregiverId },
      relations: ['patient', 'caregiver'],
    });
  }

  async hasPermission(
    patientId: string,
    caregiverId: string,
    permission: CaregiverPermission
  ): Promise<boolean> {
    const access = await this.getAccess(patientId, caregiverId);
    if (!access || !access.isActive()) {
      return false;
    }
    return access.hasPermission(permission);
  }

  async updatePermissions(
    patientId: string,
    caregiverId: string,
    permissions: CaregiverPermission[]
  ): Promise<CaregiverAccessEntity | null> {
    const access = await this.getAccess(patientId, caregiverId);
    if (!access) {
      return null;
    }

    access.setPermissions(permissions);
    await this.caregiverRepo.save(access);

    logger.info(`Updated permissions for caregiver ${caregiverId} on patient ${patientId}`);
    return access;
  }

  async updateNotificationSettings(
    patientId: string,
    caregiverId: string,
    settings: Partial<CaregiverNotificationSettings>
  ): Promise<CaregiverAccessEntity | null> {
    const access = await this.getAccess(patientId, caregiverId);
    if (!access) {
      return null;
    }

    if (settings.notifyOnMissed !== undefined) {
      access.notifyOnMissed = settings.notifyOnMissed;
    }
    if (settings.notifyOnCritical !== undefined) {
      access.notifyOnCritical = settings.notifyOnCritical;
    }
    if (settings.notifyOnLowSupply !== undefined) {
      access.notifyOnLowSupply = settings.notifyOnLowSupply;
    }
    if (settings.missedDoseThreshold !== undefined) {
      access.missedDoseThreshold = settings.missedDoseThreshold;
    }

    await this.caregiverRepo.save(access);
    return access;
  }

  async notifyCaregiversOfMissedDose(
    patientId: string,
    medicationName: string,
    scheduledTime: Date,
    missedCount: number
  ): Promise<void> {
    const caregivers = await this.getCaregiversForPatient(patientId);
    const patient = await this.userRepo.findOne({ where: { id: patientId } });

    if (!patient) return;

    const patientName = `${patient.firstName} ${patient.lastName}`.trim() || 'Your patient';

    for (const access of caregivers) {
      if (!access.isActive()) continue;
      if (!access.notifyOnMissed) continue;
      if (missedCount < access.missedDoseThreshold) continue;

      await notificationService.sendFromTemplate(
        'CAREGIVER_ALERT',
        access.caregiverId,
        {
          patientName,
          medicationName,
          scheduledTime: scheduledTime.toLocaleTimeString(),
        }
      );

      logger.info(`Notified caregiver ${access.caregiverId} of missed dose for patient ${patientId}`);
    }
  }

  async notifyCaregiversOfEmergency(
    patientId: string,
    message: string
  ): Promise<void> {
    const caregivers = await this.getCaregiversForPatient(patientId);
    const patient = await this.userRepo.findOne({ where: { id: patientId } });

    if (!patient) return;

    const patientName = `${patient.firstName} ${patient.lastName}`.trim() || 'Your patient';

    for (const access of caregivers) {
      if (!access.isActive()) continue;
      if (!access.notifyOnCritical) continue;

      await notificationService.sendFromTemplate(
        'EMERGENCY_ALERT',
        access.caregiverId,
        {
          patientName,
          message,
        }
      );

      logger.info(`Sent emergency notification to caregiver ${access.caregiverId}`);
    }
  }

  // View-only data access for caregivers
  async getPatientMedicationsForCaregiver(
    patientId: string,
    caregiverId: string
  ): Promise<any[] | null> {
    const hasAccess = await this.hasPermission(
      patientId,
      caregiverId,
      CaregiverPermission.VIEW_MEDICATIONS
    );

    if (!hasAccess) {
      return null;
    }

    // Would fetch medications from medication repository
    // Returning placeholder for now
    return [];
  }

  async getPatientAdherenceForCaregiver(
    patientId: string,
    caregiverId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any | null> {
    const hasAccess = await this.hasPermission(
      patientId,
      caregiverId,
      CaregiverPermission.VIEW_ADHERENCE
    );

    if (!hasAccess) {
      return null;
    }

    // Would fetch adherence data from adherence repository
    // Returning placeholder for now
    return {};
  }
}

export const caregiverService = new CaregiverService();
