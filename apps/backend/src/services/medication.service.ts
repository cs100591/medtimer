import { 
  medicationRepository, 
  CreateMedicationData, 
  UpdateMedicationData,
  MedicationSearchOptions,
} from '../repositories/medication.repository';
import { MedicationEntity } from '../models/entities/Medication.entity';
import { DosageUnit, MedicationForm } from '@medication-reminder/shared-types';

export interface CreateMedicationInput {
  name: string;
  genericName?: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  dosageStrength?: string;
  form: MedicationForm;
  manufacturer?: string;
  ndc?: string;
  purpose?: string;
  instructions?: string;
  userNotes?: string;
  isCritical?: boolean;
  isRescueMedication?: boolean;
  startDate?: Date;
  endDate?: Date;
  currentSupply?: number;
  lowSupplyThreshold?: number;
  costPerUnit?: number;
  insuranceCopay?: number;
}

export interface MedicationListResult {
  medications: MedicationEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MedicationService {
  async createMedication(userId: string, input: CreateMedicationInput): Promise<MedicationEntity> {
    const data: CreateMedicationData = {
      userId,
      ...input,
    };

    return medicationRepository.create(data);
  }

  async getMedication(id: string, userId: string): Promise<MedicationEntity> {
    return medicationRepository.findByIdAndUserOrFail(id, userId);
  }

  async updateMedication(
    id: string, 
    userId: string, 
    input: UpdateMedicationData
  ): Promise<MedicationEntity> {
    return medicationRepository.update(id, userId, input);
  }

  async deleteMedication(id: string, userId: string): Promise<void> {
    await medicationRepository.delete(id, userId);
  }

  async deactivateMedication(id: string, userId: string): Promise<MedicationEntity> {
    return medicationRepository.softDelete(id, userId);
  }

  async listMedications(options: MedicationSearchOptions): Promise<MedicationListResult> {
    const page = options.page || 1;
    const limit = options.limit || 20;

    const { medications, total } = await medicationRepository.findByUser(options);

    return {
      medications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchMedications(query: string, limit?: number): Promise<MedicationEntity[]> {
    return medicationRepository.search(query, limit);
  }

  async getLowSupplyMedications(userId: string): Promise<MedicationEntity[]> {
    return medicationRepository.findLowSupply(userId);
  }

  async updateSupply(id: string, userId: string, change: number): Promise<MedicationEntity> {
    return medicationRepository.updateSupply(id, userId, change);
  }

  async recordRefill(id: string, userId: string, quantity: number): Promise<MedicationEntity> {
    return medicationRepository.recordRefill(id, userId, quantity);
  }

  async getCriticalMedications(userId: string): Promise<MedicationEntity[]> {
    return medicationRepository.findCriticalMedications(userId);
  }

  async getRescueMedications(userId: string): Promise<MedicationEntity[]> {
    return medicationRepository.findRescueMedications(userId);
  }

  async getEmergencyInfo(userId: string): Promise<{
    criticalMedications: MedicationEntity[];
    rescueMedications: MedicationEntity[];
  }> {
    const [criticalMedications, rescueMedications] = await Promise.all([
      this.getCriticalMedications(userId),
      this.getRescueMedications(userId),
    ]);

    return { criticalMedications, rescueMedications };
  }

  // Calculate days until supply runs out
  calculateDaysRemaining(medication: MedicationEntity, dailyDoses: number): number {
    if (dailyDoses <= 0) return Infinity;
    return Math.floor(medication.currentSupply / dailyDoses);
  }

  // Format medication for display
  formatMedicationSummary(medication: MedicationEntity): string {
    return `${medication.name} ${medication.dosageAmount}${medication.dosageUnit}`;
  }
}

export const medicationService = new MedicationService();
