import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { AdherenceEntity } from '../models/entities/Adherence.entity';
import { AdherenceStatus } from '@medication-reminder/shared-types';

export interface AdherenceFilters {
  userId: string;
  medicationId?: string;
  scheduleId?: string;
  status?: AdherenceStatus;
  startDate?: Date;
  endDate?: Date;
}

export interface AdherenceStats {
  total: number;
  taken: number;
  skipped: number;
  snoozed: number;
  missed: number;
  pending: number;
  complianceRate: number;
  onTimeRate: number;
  averageDelayMinutes: number;
}

export class AdherenceRepository {
  private repository: Repository<AdherenceEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(AdherenceEntity);
  }

  async create(data: Partial<AdherenceEntity>): Promise<AdherenceEntity> {
    const record = this.repository.create(data);
    return this.repository.save(record);
  }

  async findById(id: string): Promise<AdherenceEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['medication', 'schedule', 'user'],
    });
  }

  async findByScheduledTime(
    scheduleId: string,
    scheduledTime: Date
  ): Promise<AdherenceEntity | null> {
    return this.repository.findOne({
      where: { scheduleId, scheduledTime },
    });
  }

  async findByFilters(filters: AdherenceFilters): Promise<AdherenceEntity[]> {
    const query = this.repository.createQueryBuilder('adherence')
      .leftJoinAndSelect('adherence.medication', 'medication')
      .where('adherence.userId = :userId', { userId: filters.userId });

    if (filters.medicationId) {
      query.andWhere('adherence.medicationId = :medicationId', { medicationId: filters.medicationId });
    }

    if (filters.scheduleId) {
      query.andWhere('adherence.scheduleId = :scheduleId', { scheduleId: filters.scheduleId });
    }

    if (filters.status) {
      query.andWhere('adherence.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('adherence.scheduledTime >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('adherence.scheduledTime <= :endDate', { endDate: filters.endDate });
    }

    query.orderBy('adherence.scheduledTime', 'DESC');

    return query.getMany();
  }

  async update(id: string, data: Partial<AdherenceEntity>): Promise<AdherenceEntity | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getStats(userId: string, startDate: Date, endDate: Date): Promise<AdherenceStats> {
    const records = await this.repository.find({
      where: {
        userId,
        scheduledTime: Between(startDate, endDate),
      },
    });

    const total = records.length;
    const taken = records.filter(r => r.status === AdherenceStatus.TAKEN).length;
    const skipped = records.filter(r => r.status === AdherenceStatus.SKIPPED).length;
    const snoozed = records.filter(r => r.status === AdherenceStatus.SNOOZED).length;
    const missed = records.filter(r => r.status === AdherenceStatus.MISSED).length;
    const pending = records.filter(r => r.status === AdherenceStatus.PENDING).length;

    const takenRecords = records.filter(r => r.status === AdherenceStatus.TAKEN && r.actualTime);
    const onTimeCount = takenRecords.filter(r => r.isOnTime(30)).length;
    
    const delays = takenRecords
      .map(r => r.getDelayMinutes())
      .filter((d): d is number => d !== null);
    
    const averageDelayMinutes = delays.length > 0
      ? delays.reduce((a, b) => a + b, 0) / delays.length
      : 0;

    const completedTotal = total - pending;
    const complianceRate = completedTotal > 0 ? (taken / completedTotal) * 100 : 0;
    const onTimeRate = takenRecords.length > 0 ? (onTimeCount / takenRecords.length) * 100 : 0;

    return {
      total,
      taken,
      skipped,
      snoozed,
      missed,
      pending,
      complianceRate: Math.round(complianceRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      averageDelayMinutes: Math.round(averageDelayMinutes * 100) / 100,
    };
  }

  async getStatsByMedication(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, AdherenceStats>> {
    const records = await this.repository.find({
      where: {
        userId,
        scheduledTime: Between(startDate, endDate),
      },
      relations: ['medication'],
    });

    const byMedication = new Map<string, AdherenceEntity[]>();
    for (const record of records) {
      const existing = byMedication.get(record.medicationId) || [];
      existing.push(record);
      byMedication.set(record.medicationId, existing);
    }

    const stats = new Map<string, AdherenceStats>();
    for (const [medicationId, medRecords] of byMedication) {
      stats.set(medicationId, this.calculateStats(medRecords));
    }

    return stats;
  }

  async getDailyStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, AdherenceStats>> {
    const records = await this.repository.find({
      where: {
        userId,
        scheduledTime: Between(startDate, endDate),
      },
    });

    const byDay = new Map<string, AdherenceEntity[]>();
    for (const record of records) {
      const dayKey = record.scheduledTime.toISOString().split('T')[0];
      const existing = byDay.get(dayKey) || [];
      existing.push(record);
      byDay.set(dayKey, existing);
    }

    const stats = new Map<string, AdherenceStats>();
    for (const [day, dayRecords] of byDay) {
      stats.set(day, this.calculateStats(dayRecords));
    }

    return stats;
  }

  async getPendingReminders(userId: string): Promise<AdherenceEntity[]> {
    const now = new Date();
    return this.repository.find({
      where: {
        userId,
        status: AdherenceStatus.PENDING,
        scheduledTime: LessThanOrEqual(now),
      },
      relations: ['medication', 'schedule'],
      order: { scheduledTime: 'ASC' },
    });
  }

  async getUpcomingReminders(userId: string, hours: number = 24): Promise<AdherenceEntity[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return this.repository.find({
      where: {
        userId,
        status: AdherenceStatus.PENDING,
        scheduledTime: Between(now, future),
      },
      relations: ['medication', 'schedule'],
      order: { scheduledTime: 'ASC' },
    });
  }

  async markMissed(cutoffTime: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .update(AdherenceEntity)
      .set({ status: AdherenceStatus.MISSED })
      .where('status = :status', { status: AdherenceStatus.PENDING })
      .andWhere('scheduledTime < :cutoff', { cutoff: cutoffTime })
      .execute();

    return result.affected ?? 0;
  }

  private calculateStats(records: AdherenceEntity[]): AdherenceStats {
    const total = records.length;
    const taken = records.filter(r => r.status === AdherenceStatus.TAKEN).length;
    const skipped = records.filter(r => r.status === AdherenceStatus.SKIPPED).length;
    const snoozed = records.filter(r => r.status === AdherenceStatus.SNOOZED).length;
    const missed = records.filter(r => r.status === AdherenceStatus.MISSED).length;
    const pending = records.filter(r => r.status === AdherenceStatus.PENDING).length;

    const takenRecords = records.filter(r => r.status === AdherenceStatus.TAKEN && r.actualTime);
    const onTimeCount = takenRecords.filter(r => r.isOnTime(30)).length;
    
    const delays = takenRecords
      .map(r => r.getDelayMinutes())
      .filter((d): d is number => d !== null);
    
    const averageDelayMinutes = delays.length > 0
      ? delays.reduce((a, b) => a + b, 0) / delays.length
      : 0;

    const completedTotal = total - pending;
    const complianceRate = completedTotal > 0 ? (taken / completedTotal) * 100 : 0;
    const onTimeRate = takenRecords.length > 0 ? (onTimeCount / takenRecords.length) * 100 : 0;

    return {
      total,
      taken,
      skipped,
      snoozed,
      missed,
      pending,
      complianceRate: Math.round(complianceRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      averageDelayMinutes: Math.round(averageDelayMinutes * 100) / 100,
    };
  }
}

export const adherenceRepository = new AdherenceRepository();
