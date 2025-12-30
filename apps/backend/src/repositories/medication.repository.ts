import { Repository, ILike } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { MedicationEntity } from '../models/entities/Medication.entity';
import { NotFoundError } from '../middleware/error.middleware';
import { DosageUnit, MedicationForm } from '@medication-reminder/shared-types';

export interface CreateMedicationData {
  userId: string;
  name: string;
  genericName?: string;
  dosageAmount: number;
  dosageUnit: DosageUnit;
  dosageStrength?: string;
  form: MedicationForm;
  manufacturer?: string;
  ndc?: string;
  rxcui?: string;
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

export interface UpdateMedicationData {
  name?: string;
  genericName?: string;
  dosageAmount?: number;
  dosageUnit?: DosageUnit;
  dosageStrength?: string;
  form?: MedicationForm;
  purpose?: string;
  instructions?: string;
  userNotes?: string;
  isCritical?: boolean;
  isRescueMedication?: boolean;
  isActive?: boolean;
  endDate?: Date;
  currentSupply?: number;
  lowSupplyThreshold?: number;
  costPerUnit?: number;
  insuranceCopay?: number;
  pharmacyName?: string;
  pharmacyPhone?: string;
}

export interface MedicationSearchOptions {
  userId: string;
  query?: string;
  isActive?: boolean;
  isCritical?: boolean;
  page?: number;
  limit?: number;
}

export class MedicationRepository {
  private repository: Repository<MedicationEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(MedicationEntity);
  }

  async findById(id: string): Promise<MedicationEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<MedicationEntity> {
    const medication = await this.findById(id);
    if (!medication) {
      throw new NotFoundError(`Medication with id ${id} not found`);
    }
    return medication;
  }

  async findByIdAndUser(id: string, userId: string): Promise<MedicationEntity | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findByIdAndUserOrFail(id: string, userId: string): Promise<MedicationEntity> {
    const medication = await this.findByIdAndUser(id, userId);
    if (!medication) {
      throw new NotFoundError(`Medication with id ${id} not found`);
    }
    return medication;
  }

  async create(data: CreateMedicationData): Promise<MedicationEntity> {
    const medication = this.repository.create({
      userId: data.userId,
      name: data.name,
      genericName: data.genericName || null,
      dosageAmount: data.dosageAmount,
      dosageUnit: data.dosageUnit,
      dosageStrength: data.dosageStrength || null,
      form: data.form,
      manufacturer: data.manufacturer || null,
      ndc: data.ndc || null,
      rxcui: data.rxcui || null,
      purpose: data.purpose || null,
      instructions: data.instructions || null,
      userNotes: data.userNotes || null,
      isCritical: data.isCritical || false,
      isRescueMedication: data.isRescueMedication || false,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || null,
      currentSupply: data.currentSupply || 0,
      lowSupplyThreshold: data.lowSupplyThreshold || 7,
      costPerUnit: data.costPerUnit || null,
      insuranceCopay: data.insuranceCopay || null,
    });

    medication.addHistoryEntry({
      action: 'started',
      newValue: data.name,
      changedBy: data.userId,
    });

    return this.repository.save(medication);
  }

  async update(id: string, userId: string, data: UpdateMedicationData): Promise<MedicationEntity> {
    const medication = await this.findByIdAndUserOrFail(id, userId);

    // Track changes for history
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

    if (data.name !== undefined && data.name !== medication.name) {
      changes.push({ field: 'name', oldValue: medication.name, newValue: data.name });
      medication.name = data.name;
    }
    if (data.genericName !== undefined) medication.genericName = data.genericName;
    if (data.dosageAmount !== undefined && data.dosageAmount !== medication.dosageAmount) {
      changes.push({ field: 'dosageAmount', oldValue: medication.dosageAmount, newValue: data.dosageAmount });
      medication.dosageAmount = data.dosageAmount;
    }
    if (data.dosageUnit !== undefined) medication.dosageUnit = data.dosageUnit;
    if (data.dosageStrength !== undefined) medication.dosageStrength = data.dosageStrength;
    if (data.form !== undefined) medication.form = data.form;
    if (data.purpose !== undefined) medication.purpose = data.purpose;
    if (data.instructions !== undefined) medication.instructions = data.instructions;
    if (data.userNotes !== undefined) medication.userNotes = data.userNotes;
    if (data.isCritical !== undefined) medication.isCritical = data.isCritical;
    if (data.isRescueMedication !== undefined) medication.isRescueMedication = data.isRescueMedication;
    if (data.isActive !== undefined) medication.isActive = data.isActive;
    if (data.endDate !== undefined) medication.endDate = data.endDate;
    if (data.currentSupply !== undefined) medication.currentSupply = data.currentSupply;
    if (data.lowSupplyThreshold !== undefined) medication.lowSupplyThreshold = data.lowSupplyThreshold;
    if (data.costPerUnit !== undefined) medication.costPerUnit = data.costPerUnit;
    if (data.insuranceCopay !== undefined) medication.insuranceCopay = data.insuranceCopay;
    if (data.pharmacyName !== undefined) medication.pharmacyName = data.pharmacyName;
    if (data.pharmacyPhone !== undefined) medication.pharmacyPhone = data.pharmacyPhone;

    // Add history entries for significant changes
    for (const change of changes) {
      medication.addHistoryEntry({
        action: `${change.field}_changed`,
        previousValue: String(change.oldValue),
        newValue: String(change.newValue),
        changedBy: userId,
      });
    }

    return this.repository.save(medication);
  }

  async delete(id: string, userId: string): Promise<void> {
    const medication = await this.findByIdAndUserOrFail(id, userId);
    await this.repository.remove(medication);
  }

  async softDelete(id: string, userId: string): Promise<MedicationEntity> {
    const medication = await this.findByIdAndUserOrFail(id, userId);
    medication.isActive = false;
    medication.endDate = new Date();
    medication.addHistoryEntry({
      action: 'stopped',
      changedBy: userId,
    });
    return this.repository.save(medication);
  }

  async findByUser(options: MedicationSearchOptions): Promise<{
    medications: MedicationEntity[];
    total: number;
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('medication')
      .where('medication.user_id = :userId', { userId: options.userId });

    if (options.query) {
      queryBuilder.andWhere(
        '(medication.name ILIKE :query OR medication.generic_name ILIKE :query)',
        { query: `%${options.query}%` }
      );
    }

    if (options.isActive !== undefined) {
      queryBuilder.andWhere('medication.is_active = :isActive', { isActive: options.isActive });
    }

    if (options.isCritical !== undefined) {
      queryBuilder.andWhere('medication.is_critical = :isCritical', { isCritical: options.isCritical });
    }

    queryBuilder
      .orderBy('medication.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [medications, total] = await queryBuilder.getManyAndCount();

    return { medications, total };
  }

  async search(query: string, limit: number = 10): Promise<MedicationEntity[]> {
    return this.repository.find({
      where: [
        { name: ILike(`%${query}%`) },
        { genericName: ILike(`%${query}%`) },
      ],
      take: limit,
      order: { name: 'ASC' },
    });
  }

  async findLowSupply(userId: string): Promise<MedicationEntity[]> {
    return this.repository
      .createQueryBuilder('medication')
      .where('medication.user_id = :userId', { userId })
      .andWhere('medication.is_active = true')
      .andWhere('medication.current_supply <= medication.low_supply_threshold')
      .getMany();
  }

  async updateSupply(id: string, userId: string, change: number): Promise<MedicationEntity> {
    const medication = await this.findByIdAndUserOrFail(id, userId);
    medication.currentSupply = Math.max(0, medication.currentSupply + change);
    return this.repository.save(medication);
  }

  async recordRefill(id: string, userId: string, quantity: number): Promise<MedicationEntity> {
    const medication = await this.findByIdAndUserOrFail(id, userId);
    medication.currentSupply += quantity;
    medication.lastRefillDate = new Date();
    medication.addHistoryEntry({
      action: 'refilled',
      newValue: String(quantity),
      changedBy: userId,
    });
    return this.repository.save(medication);
  }

  async findCriticalMedications(userId: string): Promise<MedicationEntity[]> {
    return this.repository.find({
      where: { userId, isActive: true, isCritical: true },
      order: { name: 'ASC' },
    });
  }

  async findRescueMedications(userId: string): Promise<MedicationEntity[]> {
    return this.repository.find({
      where: { userId, isActive: true, isRescueMedication: true },
      order: { name: 'ASC' },
    });
  }

  // Alias for backward compatibility
  async findByUserId(userId: string): Promise<MedicationEntity[]> {
    const result = await this.findByUser({ userId, isActive: true });
    return result.medications;
  }
}

export const medicationRepository = new MedicationRepository();
