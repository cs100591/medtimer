import { AdherenceStatus } from '@medication-reminder/shared-types';
import { AdherenceEntity } from '../models/entities/Adherence.entity';
import { AdherenceRepository, AdherenceStats, AdherenceFilters } from '../repositories/adherence.repository';
import { MedicationRepository } from '../repositories/medication.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { escalationService } from './escalation.service';
import { logger } from '../utils/logger';

export interface LogAdherenceInput {
  scheduleId: string;
  scheduledTime: Date;
  status: AdherenceStatus;
  notes?: string;
  location?: { latitude: number; longitude: number; accuracy?: number };
  method?: 'manual' | 'auto' | 'dispenser' | 'voice';
}

export interface SnoozeInput {
  scheduleId: string;
  scheduledTime: Date;
  snoozeMinutes: number;
  notes?: string;
}

export interface AdherenceReportData {
  period: { start: Date; end: Date };
  overall: AdherenceStats;
  byMedication: Array<{
    medicationId: string;
    medicationName: string;
    stats: AdherenceStats;
  }>;
  dailyTrend: Array<{
    date: string;
    stats: AdherenceStats;
  }>;
  patterns: {
    mostMissedTimes: string[];
    bestComplianceDays: string[];
    averageSnoozeMinutes: number;
  };
}

export class AdherenceService {
  constructor(
    private adherenceRepo: AdherenceRepository,
    private medicationRepo: MedicationRepository,
    private scheduleRepo: ScheduleRepository
  ) {}

  async logAdherence(userId: string, input: LogAdherenceInput): Promise<AdherenceEntity> {
    const schedule = await this.scheduleRepo.findById(input.scheduleId);
    if (!schedule || schedule.userId !== userId) {
      throw new Error('Schedule not found');
    }

    // Check if record already exists
    let record = await this.adherenceRepo.findByScheduledTime(
      input.scheduleId,
      input.scheduledTime
    );

    const actualTime = input.status === AdherenceStatus.TAKEN ? new Date() : null;

    if (record) {
      // Update existing record
      record = await this.adherenceRepo.update(record.id, {
        status: input.status,
        actualTime,
        notes: input.notes || record.notes,
        method: input.method || record.method,
      }) as AdherenceEntity;

      if (input.location) {
        record.setLocation(input.location);
        await this.adherenceRepo.update(record.id, { location: record.location });
      }
    } else {
      // Create new record
      record = await this.adherenceRepo.create({
        userId,
        medicationId: schedule.medicationId,
        scheduleId: input.scheduleId,
        scheduledTime: input.scheduledTime,
        actualTime,
        status: input.status,
        notes: input.notes,
        method: input.method || 'manual',
      });

      if (input.location) {
        record.setLocation(input.location);
        await this.adherenceRepo.update(record.id, { location: record.location });
      }
    }

    // Resolve any active escalation
    if (input.status === AdherenceStatus.TAKEN || input.status === AdherenceStatus.SKIPPED) {
      const resolvedBy = input.status === AdherenceStatus.TAKEN ? 'taken' : 'skipped';
      escalationService.resolveEscalation(input.scheduleId, input.scheduledTime, resolvedBy);
    }

    logger.info(`Logged adherence for schedule ${input.scheduleId}: ${input.status}`);
    return record;
  }

  async snoozeReminder(userId: string, input: SnoozeInput): Promise<AdherenceEntity> {
    const schedule = await this.scheduleRepo.findById(input.scheduleId);
    if (!schedule || schedule.userId !== userId) {
      throw new Error('Schedule not found');
    }

    let record = await this.adherenceRepo.findByScheduledTime(
      input.scheduleId,
      input.scheduledTime
    );

    const snoozedUntil = new Date(Date.now() + input.snoozeMinutes * 60 * 1000);

    if (record) {
      record = await this.adherenceRepo.update(record.id, {
        status: AdherenceStatus.SNOOZED,
        snoozeCount: record.snoozeCount + 1,
        snoozedUntil,
        notes: input.notes || record.notes,
      }) as AdherenceEntity;
    } else {
      record = await this.adherenceRepo.create({
        userId,
        medicationId: schedule.medicationId,
        scheduleId: input.scheduleId,
        scheduledTime: input.scheduledTime,
        status: AdherenceStatus.SNOOZED,
        snoozeCount: 1,
        snoozedUntil,
        notes: input.notes,
        method: 'manual',
      });
    }

    logger.info(`Snoozed reminder for schedule ${input.scheduleId} until ${snoozedUntil.toISOString()}`);
    return record;
  }

  async getAdherenceHistory(
    userId: string,
    filters: Omit<AdherenceFilters, 'userId'>
  ): Promise<AdherenceEntity[]> {
    return this.adherenceRepo.findByFilters({ ...filters, userId });
  }

  async getStats(userId: string, startDate: Date, endDate: Date): Promise<AdherenceStats> {
    return this.adherenceRepo.getStats(userId, startDate, endDate);
  }

  async generateReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AdherenceReportData> {
    const overall = await this.adherenceRepo.getStats(userId, startDate, endDate);
    const byMedicationMap = await this.adherenceRepo.getStatsByMedication(userId, startDate, endDate);
    const dailyStatsMap = await this.adherenceRepo.getDailyStats(userId, startDate, endDate);

    // Get medication names
    const byMedication: AdherenceReportData['byMedication'] = [];
    for (const [medicationId, stats] of byMedicationMap) {
      const medication = await this.medicationRepo.findById(medicationId);
      byMedication.push({
        medicationId,
        medicationName: medication?.name || 'Unknown',
        stats,
      });
    }

    // Convert daily stats to array
    const dailyTrend: AdherenceReportData['dailyTrend'] = [];
    for (const [date, stats] of dailyStatsMap) {
      dailyTrend.push({ date, stats });
    }
    dailyTrend.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate patterns
    const records = await this.adherenceRepo.findByFilters({
      userId,
      startDate,
      endDate,
    });

    const patterns = this.analyzePatterns(records, dailyTrend);

    return {
      period: { start: startDate, end: endDate },
      overall,
      byMedication,
      dailyTrend,
      patterns,
    };
  }

  async getPendingReminders(userId: string): Promise<AdherenceEntity[]> {
    return this.adherenceRepo.getPendingReminders(userId);
  }

  async getUpcomingReminders(userId: string, hours: number = 24): Promise<AdherenceEntity[]> {
    return this.adherenceRepo.getUpcomingReminders(userId, hours);
  }

  async createPendingRecord(
    userId: string,
    medicationId: string,
    scheduleId: string,
    scheduledTime: Date
  ): Promise<AdherenceEntity> {
    // Check if already exists
    const existing = await this.adherenceRepo.findByScheduledTime(scheduleId, scheduledTime);
    if (existing) {
      return existing;
    }

    return this.adherenceRepo.create({
      userId,
      medicationId,
      scheduleId,
      scheduledTime,
      status: AdherenceStatus.PENDING,
      method: 'auto',
    });
  }

  async markMissedReminders(cutoffHours: number = 4): Promise<number> {
    const cutoffTime = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);
    const count = await this.adherenceRepo.markMissed(cutoffTime);
    
    if (count > 0) {
      logger.info(`Marked ${count} reminders as missed (cutoff: ${cutoffTime.toISOString()})`);
    }
    
    return count;
  }

  async exportToCSV(userId: string, startDate: Date, endDate: Date): Promise<string> {
    const records = await this.adherenceRepo.findByFilters({
      userId,
      startDate,
      endDate,
    });

    const headers = [
      'Date',
      'Time',
      'Medication',
      'Status',
      'Actual Time',
      'Delay (min)',
      'Notes',
      'Method',
    ];

    const rows = await Promise.all(
      records.map(async (record) => {
        const medication = await this.medicationRepo.findById(record.medicationId);
        const scheduledDate = record.scheduledTime.toISOString().split('T')[0];
        const scheduledTime = record.scheduledTime.toISOString().split('T')[1].substring(0, 5);
        const actualTime = record.actualTime
          ? record.actualTime.toISOString().split('T')[1].substring(0, 5)
          : '';
        const delay = record.getDelayMinutes();

        return [
          scheduledDate,
          scheduledTime,
          medication?.name || 'Unknown',
          record.status,
          actualTime,
          delay !== null ? delay.toString() : '',
          record.notes || '',
          record.method,
        ];
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  private analyzePatterns(
    records: AdherenceEntity[],
    dailyTrend: AdherenceReportData['dailyTrend']
  ): AdherenceReportData['patterns'] {
    // Find most missed times
    const missedByHour = new Map<number, number>();
    for (const record of records) {
      if (record.status === AdherenceStatus.MISSED) {
        const hour = record.scheduledTime.getHours();
        missedByHour.set(hour, (missedByHour.get(hour) || 0) + 1);
      }
    }

    const sortedMissedHours = Array.from(missedByHour.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour.toString().padStart(2, '0')}:00`);

    // Find best compliance days
    const sortedDays = [...dailyTrend]
      .sort((a, b) => b.stats.complianceRate - a.stats.complianceRate)
      .slice(0, 3)
      .map(d => d.date);

    // Calculate average snooze time
    const snoozedRecords = records.filter(r => r.snoozeCount > 0);
    let totalSnoozeMinutes = 0;
    let snoozeCount = 0;

    for (const record of snoozedRecords) {
      if (record.snoozedUntil && record.scheduledTime) {
        const snoozeMinutes = (record.snoozedUntil.getTime() - record.scheduledTime.getTime()) / 60000;
        totalSnoozeMinutes += snoozeMinutes;
        snoozeCount++;
      }
    }

    const averageSnoozeMinutes = snoozeCount > 0
      ? Math.round(totalSnoozeMinutes / snoozeCount)
      : 0;

    return {
      mostMissedTimes: sortedMissedHours,
      bestComplianceDays: sortedDays,
      averageSnoozeMinutes,
    };
  }
}

// Factory function for dependency injection
export function createAdherenceService(): AdherenceService {
  const { adherenceRepository } = require('../repositories/adherence.repository');
  const { medicationRepository } = require('../repositories/medication.repository');
  const { scheduleRepository } = require('../repositories/schedule.repository');
  
  return new AdherenceService(adherenceRepository, medicationRepository, scheduleRepository);
}

export const adherenceService = createAdherenceService();
