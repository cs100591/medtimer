import { MedicationRepository } from '../repositories/medication.repository';
import { AdherenceRepository } from '../repositories/adherence.repository';
import { notificationService, NotificationChannel, NotificationPriority } from './notification.service';
import { caregiverService } from './caregiver.service';
import { logger } from '../utils/logger';

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
  notifyOnEmergency: boolean;
}

export interface EmergencyMedicationInfo {
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  isCritical: boolean;
  isRescue: boolean;
  lastTaken?: Date;
}

export interface EmergencyScreenData {
  userId: string;
  userName: string;
  emergencyContacts: EmergencyContact[];
  criticalMedications: EmergencyMedicationInfo[];
  rescueMedications: EmergencyMedicationInfo[];
  allergies: string[];
  medicalConditions: string[];
  bloodType?: string;
  lastUpdated: Date;
}

export interface RescueMedicationLog {
  medicationId: string;
  userId: string;
  timestamp: Date;
  location?: { latitude: number; longitude: number; accuracy?: number };
  symptoms?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notifiedContacts: string[];
}

export class EmergencyService {
  private emergencyContacts: Map<string, EmergencyContact[]> = new Map();
  private rescueLogs: RescueMedicationLog[] = [];

  constructor(
    private medicationRepo: MedicationRepository,
    private adherenceRepo: AdherenceRepository
  ) {}

  async getEmergencyScreenData(userId: string): Promise<EmergencyScreenData> {
    const medications = await this.medicationRepo.findByUserId(userId);
    
    const criticalMedications = medications
      .filter(m => m.isCritical && m.isActive)
      .map(m => ({
        medicationId: m.id,
        medicationName: m.name,
        dosage: `${m.dosageAmount} ${m.dosageUnit}`,
        instructions: m.instructions || '',
        isCritical: true,
        isRescue: m.isRescueMedication,
      }));

    const rescueMedications = medications
      .filter(m => m.isRescueMedication && m.isActive)
      .map(m => ({
        medicationId: m.id,
        medicationName: m.name,
        dosage: `${m.dosageAmount} ${m.dosageUnit}`,
        instructions: m.instructions || '',
        isCritical: m.isCritical,
        isRescue: true,
      }));

    const contacts = this.emergencyContacts.get(userId) || [];

    return {
      userId,
      userName: '', // Would be fetched from user service
      emergencyContacts: contacts,
      criticalMedications,
      rescueMedications,
      allergies: [], // Would be fetched from user profile
      medicalConditions: [],
      lastUpdated: new Date(),
    };
  }

  async logRescueMedicationUse(
    userId: string,
    medicationId: string,
    options?: {
      location?: { latitude: number; longitude: number; accuracy?: number };
      symptoms?: string;
      severity?: 'mild' | 'moderate' | 'severe';
    }
  ): Promise<RescueMedicationLog> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication || medication.userId !== userId) {
      throw new Error('Medication not found');
    }

    if (!medication.isRescueMedication) {
      throw new Error('Not a rescue medication');
    }

    const notifiedContacts: string[] = [];

    // Notify emergency contacts
    const contacts = this.emergencyContacts.get(userId) || [];
    for (const contact of contacts) {
      if (contact.notifyOnEmergency) {
        await this.notifyEmergencyContact(contact, medication.name, options?.severity);
        notifiedContacts.push(contact.id);
      }
    }

    // Notify caregivers
    await caregiverService.notifyCaregiversOfEmergency(
      userId,
      `Used rescue medication: ${medication.name}`
    );

    const log: RescueMedicationLog = {
      medicationId,
      userId,
      timestamp: new Date(),
      location: options?.location,
      symptoms: options?.symptoms,
      severity: options?.severity,
      notifiedContacts,
    };

    this.rescueLogs.push(log);
    logger.info(`Rescue medication ${medicationId} used by user ${userId}`);

    return log;
  }

  async addEmergencyContact(
    userId: string,
    contact: Omit<EmergencyContact, 'id' | 'userId'>
  ): Promise<EmergencyContact> {
    const contacts = this.emergencyContacts.get(userId) || [];

    // If this is primary, remove primary from others
    if (contact.isPrimary) {
      for (const c of contacts) {
        c.isPrimary = false;
      }
    }

    const newContact: EmergencyContact = {
      ...contact,
      id: `ec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
    };

    contacts.push(newContact);
    this.emergencyContacts.set(userId, contacts);

    logger.info(`Added emergency contact for user ${userId}`);
    return newContact;
  }

  async updateEmergencyContact(
    userId: string,
    contactId: string,
    updates: Partial<Omit<EmergencyContact, 'id' | 'userId'>>
  ): Promise<EmergencyContact | null> {
    const contacts = this.emergencyContacts.get(userId) || [];
    const index = contacts.findIndex(c => c.id === contactId);

    if (index === -1) {
      return null;
    }

    // If setting as primary, remove primary from others
    if (updates.isPrimary) {
      for (const c of contacts) {
        c.isPrimary = false;
      }
    }

    contacts[index] = { ...contacts[index], ...updates };
    this.emergencyContacts.set(userId, contacts);

    return contacts[index];
  }

  async removeEmergencyContact(userId: string, contactId: string): Promise<boolean> {
    const contacts = this.emergencyContacts.get(userId) || [];
    const index = contacts.findIndex(c => c.id === contactId);

    if (index === -1) {
      return false;
    }

    contacts.splice(index, 1);
    this.emergencyContacts.set(userId, contacts);

    return true;
  }

  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return this.emergencyContacts.get(userId) || [];
  }

  async triggerEmergencyAlert(
    userId: string,
    reason: string,
    medicationId?: string
  ): Promise<void> {
    const contacts = this.emergencyContacts.get(userId) || [];

    // Notify all emergency contacts
    for (const contact of contacts) {
      if (contact.notifyOnEmergency) {
        await notificationService.send({
          userId: contact.id,
          title: 'EMERGENCY ALERT',
          body: reason,
          channels: [NotificationChannel.SMS, NotificationChannel.CALL],
          priority: NotificationPriority.CRITICAL,
        });
      }
    }

    // Notify caregivers
    await caregiverService.notifyCaregiversOfEmergency(userId, reason);

    logger.warn(`Emergency alert triggered for user ${userId}: ${reason}`);
  }

  async checkCriticalMedicationMissed(
    userId: string,
    medicationId: string,
    missedCount: number
  ): Promise<boolean> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication || !medication.isCritical) {
      return false;
    }

    // Trigger emergency if critical medication missed multiple times
    if (missedCount >= 2) {
      await this.triggerEmergencyAlert(
        userId,
        `Critical medication "${medication.name}" has been missed ${missedCount} times`,
        medicationId
      );
      return true;
    }

    return false;
  }

  private async notifyEmergencyContact(
    contact: EmergencyContact,
    medicationName: string,
    severity?: 'mild' | 'moderate' | 'severe'
  ): Promise<void> {
    const severityText = severity ? ` (${severity})` : '';
    
    await notificationService.send({
      userId: contact.id,
      title: 'Rescue Medication Used',
      body: `${contact.name}'s contact used rescue medication: ${medicationName}${severityText}`,
      channels: [NotificationChannel.SMS, NotificationChannel.PUSH],
      priority: NotificationPriority.CRITICAL,
    });
  }

  getRescueMedicationLogs(userId: string, limit: number = 50): RescueMedicationLog[] {
    return this.rescueLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

// Factory function
export function createEmergencyService(): EmergencyService {
  const { medicationRepository } = require('../repositories/medication.repository');
  const { adherenceRepository } = require('../repositories/adherence.repository');
  return new EmergencyService(medicationRepository, adherenceRepository);
}

export const emergencyService = createEmergencyService();
