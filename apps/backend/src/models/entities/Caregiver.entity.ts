import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CaregiverPermission, CaregiverStatus } from '@medication-reminder/shared-types';
import { UserEntity } from './User.entity';

@Entity('caregiver_access')
export class CaregiverAccessEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: UserEntity;

  @Column({ name: 'caregiver_id', type: 'uuid' })
  caregiverId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caregiver_id' })
  caregiver: UserEntity;

  @Column({ type: 'varchar', default: 'pending' })
  status: CaregiverStatus;

  @Column({ type: 'jsonb', default: '[]' })
  permissions: string;

  @Column({ type: 'varchar', nullable: true })
  relationship: string | null;

  @Column({ name: 'invitation_token', type: 'varchar', nullable: true })
  invitationToken: string | null;

  @Column({ name: 'invitation_expires_at', type: 'timestamp with time zone', nullable: true })
  invitationExpiresAt: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamp with time zone', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamp with time zone', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy: string | null;

  @Column({ name: 'notify_on_missed', type: 'boolean', default: true })
  notifyOnMissed: boolean;

  @Column({ name: 'notify_on_critical', type: 'boolean', default: true })
  notifyOnCritical: boolean;

  @Column({ name: 'notify_on_low_supply', type: 'boolean', default: false })
  notifyOnLowSupply: boolean;

  @Column({ name: 'missed_dose_threshold', type: 'integer', default: 2 })
  missedDoseThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  getPermissions(): CaregiverPermission[] {
    return JSON.parse(this.permissions || '[]');
  }

  setPermissions(perms: CaregiverPermission[]): void {
    this.permissions = JSON.stringify(perms);
  }

  hasPermission(permission: CaregiverPermission): boolean {
    const perms = this.getPermissions();
    return perms.includes(permission);
  }

  addPermission(permission: CaregiverPermission): void {
    const perms = this.getPermissions();
    if (!perms.includes(permission)) {
      perms.push(permission);
      this.setPermissions(perms);
    }
  }

  removePermission(permission: CaregiverPermission): void {
    const perms = this.getPermissions();
    const index = perms.indexOf(permission);
    if (index > -1) {
      perms.splice(index, 1);
      this.setPermissions(perms);
    }
  }

  isActive(): boolean {
    return this.status === CaregiverStatus.ACTIVE;
  }

  isPending(): boolean {
    return this.status === CaregiverStatus.PENDING;
  }

  isExpired(): boolean {
    if (!this.invitationExpiresAt) return false;
    return new Date() > this.invitationExpiresAt;
  }
}
