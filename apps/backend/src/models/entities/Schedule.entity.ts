import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { 
  FrequencyType, 
  DurationType,
  EscalationLevel,
} from '../../types/shared-types';
import { UserEntity } from './User.entity';
import { MedicationEntity } from './Medication.entity';

@Entity('medication_schedules')
export class ScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'medication_id', type: 'uuid' })
  medicationId: string;

  @ManyToOne(() => MedicationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medication_id' })
  medication: MedicationEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'frequency_type', type: 'varchar' })
  frequencyType: FrequencyType;

  @Column({ name: 'frequency_interval', type: 'integer', default: 1 })
  frequencyInterval: number;

  @Column({ name: 'times_per_day', type: 'integer', default: 1 })
  timesPerDay: number;

  @Column({ name: 'specific_days', type: 'jsonb', nullable: true })
  specificDays: string | null;

  @Column({ name: 'time_slots', type: 'jsonb', default: '[]' })
  timeSlots: string;

  @Column({ name: 'custom_cycle', type: 'jsonb', nullable: true })
  customCycle: string | null;

  @Column({ name: 'duration_type', type: 'varchar' })
  durationType: DurationType;

  @Column({ name: 'duration_start_date', type: 'date' })
  durationStartDate: Date;

  @Column({ name: 'duration_end_date', type: 'date', nullable: true })
  durationEndDate: Date | null;

  @Column({ name: 'total_days', type: 'integer', nullable: true })
  totalDays: number | null;

  @Column({ name: 'with_food', type: 'boolean', default: false })
  withFood: boolean;

  @Column({ name: 'before_meals', type: 'boolean', default: false })
  beforeMeals: boolean;

  @Column({ name: 'after_meals', type: 'boolean', default: false })
  afterMeals: boolean;

  @Column({ name: 'at_bedtime', type: 'boolean', default: false })
  atBedtime: boolean;

  @Column({ name: 'on_waking', type: 'boolean', default: false })
  onWaking: boolean;

  @Column({ name: 'empty_stomach', type: 'boolean', default: false })
  emptyStomach: boolean;

  @Column({ name: 'custom_instructions', type: 'text', nullable: true })
  customInstructions: string | null;

  @Column({ name: 'escalation_rules', type: 'jsonb', default: '[]' })
  escalationRules: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_paused', type: 'boolean', default: false })
  isPaused: boolean;

  @Column({ name: 'paused_until', type: 'timestamp with time zone', nullable: true })
  pausedUntil: Date | null;

  @Column({ name: 'last_reminder_at', type: 'timestamp with time zone', nullable: true })
  lastReminderAt: Date | null;

  @Column({ name: 'next_reminder_at', type: 'timestamp with time zone', nullable: true })
  nextReminderAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  getTimeSlots(): Array<{ hour: number; minute: number; label?: string }> {
    return JSON.parse(this.timeSlots || '[]');
  }

  setTimeSlots(slots: Array<{ hour: number; minute: number; label?: string }>): void {
    this.timeSlots = JSON.stringify(slots);
  }

  getSpecificDays(): number[] | null {
    return this.specificDays ? JSON.parse(this.specificDays) : null;
  }

  setSpecificDays(days: number[] | null): void {
    this.specificDays = days ? JSON.stringify(days) : null;
  }

  getCustomCycle(): { activeDays: number; breakDays: number; startDate: string } | null {
    return this.customCycle ? JSON.parse(this.customCycle) : null;
  }

  setCustomCycle(cycle: { activeDays: number; breakDays: number; startDate: Date } | null): void {
    this.customCycle = cycle ? JSON.stringify({
      ...cycle,
      startDate: cycle.startDate.toISOString(),
    }) : null;
  }

  getEscalationRules(): Array<{
    level: EscalationLevel;
    delayMinutes: number;
    maxAttempts: number;
    notifyCaregiver: boolean;
  }> {
    return JSON.parse(this.escalationRules || '[]');
  }

  setEscalationRules(rules: Array<{
    level: EscalationLevel;
    delayMinutes: number;
    maxAttempts: number;
    notifyCaregiver: boolean;
  }>): void {
    this.escalationRules = JSON.stringify(rules);
  }

  getDefaultEscalationRules(): Array<{
    level: EscalationLevel;
    delayMinutes: number;
    maxAttempts: number;
    notifyCaregiver: boolean;
  }> {
    return [
      { level: EscalationLevel.GENTLE, delayMinutes: 0, maxAttempts: 1, notifyCaregiver: false },
      { level: EscalationLevel.REPEAT, delayMinutes: 15, maxAttempts: 2, notifyCaregiver: false },
      { level: EscalationLevel.SMS, delayMinutes: 30, maxAttempts: 1, notifyCaregiver: true },
    ];
  }
}
