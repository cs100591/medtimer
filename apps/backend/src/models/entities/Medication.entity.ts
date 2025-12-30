import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { 
  DosageUnit, 
  MedicationForm,
} from '@medication-reminder/shared-types';
import { UserEntity } from './User.entity';

@Entity('medications')
export class MedicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'generic_name', type: 'varchar', nullable: true })
  genericName: string | null;

  @Column({ name: 'dosage_amount', type: 'decimal', precision: 10, scale: 2 })
  dosageAmount: number;

  @Column({ name: 'dosage_unit', type: 'varchar' })
  dosageUnit: DosageUnit;

  @Column({ name: 'dosage_strength', type: 'varchar', nullable: true })
  dosageStrength: string | null;

  @Column({ type: 'varchar' })
  form: MedicationForm;

  @Column({ type: 'varchar', nullable: true })
  manufacturer: string | null;

  @Column({ type: 'varchar', nullable: true })
  ndc: string | null;

  @Column({ type: 'varchar', nullable: true })
  rxcui: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  images: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  @Column({ name: 'user_notes', type: 'text', nullable: true })
  userNotes: string | null;

  @Column({ name: 'side_effects', type: 'jsonb', default: '[]' })
  sideEffects: string;

  @Column({ name: 'drug_interactions', type: 'jsonb', default: '[]' })
  drugInteractions: string;

  @Column({ name: 'food_interactions', type: 'jsonb', default: '[]' })
  foodInteractions: string;

  @Column({ name: 'current_supply', type: 'integer', default: 0 })
  currentSupply: number;

  @Column({ name: 'low_supply_threshold', type: 'integer', default: 7 })
  lowSupplyThreshold: number;

  @Column({ name: 'last_refill_date', type: 'date', nullable: true })
  lastRefillDate: Date | null;

  @Column({ name: 'pharmacy_name', type: 'varchar', nullable: true })
  pharmacyName: string | null;

  @Column({ name: 'pharmacy_phone', type: 'varchar', nullable: true })
  pharmacyPhone: string | null;

  @Column({ name: 'prescription_number', type: 'varchar', nullable: true })
  prescriptionNumber: string | null;

  @Column({ name: 'cost_per_unit', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerUnit: number | null;

  @Column({ type: 'varchar', nullable: true, default: 'USD' })
  currency: string;

  @Column({ name: 'insurance_copay', type: 'decimal', precision: 10, scale: 2, nullable: true })
  insuranceCopay: number | null;

  @Column({ name: 'history', type: 'jsonb', default: '[]' })
  history: string;

  @Column({ name: 'is_critical', type: 'boolean', default: false })
  isCritical: boolean;

  @Column({ name: 'is_rescue_medication', type: 'boolean', default: false })
  isRescueMedication: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  getImages(): Array<{ id: string; url: string; isPrimary: boolean; source: string }> {
    return JSON.parse(this.images || '[]');
  }

  setImages(images: Array<{ id: string; url: string; isPrimary: boolean; source: string }>): void {
    this.images = JSON.stringify(images);
  }

  getSideEffects(): Array<{ name: string; frequency: string; severity: string }> {
    return JSON.parse(this.sideEffects || '[]');
  }

  setSideEffects(effects: Array<{ name: string; frequency: string; severity: string }>): void {
    this.sideEffects = JSON.stringify(effects);
  }

  getDrugInteractions(): Array<Record<string, unknown>> {
    return JSON.parse(this.drugInteractions || '[]');
  }

  setDrugInteractions(interactions: Array<Record<string, unknown>>): void {
    this.drugInteractions = JSON.stringify(interactions);
  }

  getFoodInteractions(): Array<Record<string, unknown>> {
    return JSON.parse(this.foodInteractions || '[]');
  }

  setFoodInteractions(interactions: Array<Record<string, unknown>>): void {
    this.foodInteractions = JSON.stringify(interactions);
  }

  getHistory(): Array<Record<string, unknown>> {
    return JSON.parse(this.history || '[]');
  }

  addHistoryEntry(entry: Record<string, unknown>): void {
    const history = this.getHistory();
    history.push({ ...entry, changedAt: new Date().toISOString() });
    this.history = JSON.stringify(history);
  }

  isLowSupply(): boolean {
    return this.currentSupply <= this.lowSupplyThreshold;
  }
}
