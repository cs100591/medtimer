import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { 
  SupportedLanguage, 
  MeasurementUnit, 
  TimeFormat, 
  DateFormat 
} from '../../types/shared-types';
import { encryptField, decryptField } from '../../utils/encryption';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ name: 'phone_encrypted', type: 'text', nullable: true })
  phoneEncrypted: string | null;

  @Column({ name: 'emergency_contacts', type: 'jsonb', default: '[]' })
  emergencyContacts: string;

  @Column({ name: 'language', type: 'varchar', default: SupportedLanguage.EN })
  language: SupportedLanguage;

  @Column({ name: 'region', default: 'US' })
  region: string;

  @Column({ name: 'date_format', type: 'varchar', default: DateFormat.MDY })
  dateFormat: DateFormat;

  @Column({ name: 'time_format', type: 'varchar', default: TimeFormat.TWELVE_HOUR })
  timeFormat: TimeFormat;

  @Column({ name: 'measurement_unit', type: 'varchar', default: MeasurementUnit.IMPERIAL })
  measurementUnit: MeasurementUnit;

  @Column({ name: 'timezone', default: 'America/New_York' })
  timezone: string;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled: boolean;

  @Column({ name: 'sms_enabled', default: false })
  smsEnabled: boolean;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled: boolean;

  @Column({ name: 'quiet_hours_start', type: 'varchar', nullable: true })
  quietHoursStart: string | null;

  @Column({ name: 'quiet_hours_end', type: 'varchar', nullable: true })
  quietHoursEnd: string | null;

  @Column({ name: 'escalation_enabled', default: true })
  escalationEnabled: boolean;

  @Column({ name: 'high_contrast_mode', default: false })
  highContrastMode: boolean;

  @Column({ name: 'large_text', default: false })
  largeText: boolean;

  @Column({ name: 'font_size', default: 16 })
  fontSize: number;

  @Column({ name: 'voice_enabled', default: false })
  voiceEnabled: boolean;

  @Column({ name: 'haptic_feedback', default: true })
  hapticFeedback: boolean;

  @Column({ name: 'share_with_caregivers', default: false })
  shareWithCaregivers: boolean;

  @Column({ name: 'share_with_health_apps', default: false })
  shareWithHealthApps: boolean;

  @Column({ name: 'analytics_enabled', default: true })
  analyticsEnabled: boolean;

  @Column({ name: 'allergies', type: 'jsonb', default: '[]' })
  allergies: string;

  @Column({ name: 'conditions', type: 'jsonb', default: '[]' })
  conditions: string;

  @Column({ name: 'blood_type', type: 'varchar', nullable: true })
  bloodType: string | null;

  @Column({ name: 'insurance_info_encrypted', type: 'text', nullable: true })
  insuranceInfoEncrypted: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp with time zone', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods for encrypted fields
  setPhone(phone: string | null): void {
    this.phoneEncrypted = phone ? encryptField(phone) : null;
  }

  getPhone(): string | null {
    return this.phoneEncrypted ? decryptField(this.phoneEncrypted) : null;
  }

  setInsuranceInfo(info: Record<string, unknown> | null): void {
    this.insuranceInfoEncrypted = info ? encryptField(JSON.stringify(info)) : null;
  }

  getInsuranceInfo(): Record<string, unknown> | null {
    if (!this.insuranceInfoEncrypted) return null;
    return JSON.parse(decryptField(this.insuranceInfoEncrypted));
  }
}
