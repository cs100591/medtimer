import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AdherenceStatus } from '@medication-reminder/shared-types';
import { UserEntity } from './User.entity';
import { MedicationEntity } from './Medication.entity';
import { ScheduleEntity } from './Schedule.entity';

@Entity('adherence_records')
export class AdherenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'medication_id', type: 'uuid' })
  medicationId: string;

  @ManyToOne(() => MedicationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medication_id' })
  medication: MedicationEntity;

  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => ScheduleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: ScheduleEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'scheduled_time', type: 'timestamp with time zone' })
  scheduledTime: Date;

  @Column({ name: 'actual_time', type: 'timestamp with time zone', nullable: true })
  actualTime: Date | null;

  @Column({ type: 'varchar' })
  status: AdherenceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', default: 'manual' })
  method: string;

  @Column({ name: 'snooze_count', type: 'integer', default: 0 })
  snoozeCount: number;

  @Column({ name: 'snoozed_until', type: 'timestamp with time zone', nullable: true })
  snoozedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  getLocation(): { latitude: number; longitude: number; accuracy?: number; timestamp: Date } | null {
    return this.location ? JSON.parse(this.location) : null;
  }

  setLocation(loc: { latitude: number; longitude: number; accuracy?: number } | null): void {
    this.location = loc ? JSON.stringify({ ...loc, timestamp: new Date().toISOString() }) : null;
  }

  getDelayMinutes(): number | null {
    if (!this.actualTime) return null;
    const diff = this.actualTime.getTime() - this.scheduledTime.getTime();
    return Math.round(diff / 60000);
  }

  isOnTime(toleranceMinutes: number = 30): boolean {
    const delay = this.getDelayMinutes();
    if (delay === null) return false;
    return Math.abs(delay) <= toleranceMinutes;
  }
}
