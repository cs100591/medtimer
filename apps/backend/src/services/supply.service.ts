import { MedicationEntity } from '../models/entities/Medication.entity';
import { MedicationRepository } from '../repositories/medication.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { notificationService, NOTIFICATION_TEMPLATES } from './notification.service';
import { logger } from '../utils/logger';

export interface RefillRecord {
  id: string;
  medicationId: string;
  quantity: number;
  refillDate: Date;
  pharmacyName?: string;
  cost?: number;
  notes?: string;
}

export interface SupplyStatus {
  medicationId: string;
  medicationName: string;
  currentSupply: number;
  lowSupplyThreshold: number;
  isLowSupply: boolean;
  estimatedDaysRemaining: number;
  estimatedRunOutDate: Date | null;
  dailyUsage: number;
  lastRefillDate: Date | null;
}

export interface RefillReminder {
  medicationId: string;
  medicationName: string;
  currentSupply: number;
  daysRemaining: number;
  pharmacyName?: string;
  pharmacyPhone?: string;
  prescriptionNumber?: string;
}

export class SupplyService {
  constructor(
    private medicationRepo: MedicationRepository,
    private scheduleRepo: ScheduleRepository
  ) {}

  async getSupplyStatus(medicationId: string): Promise<SupplyStatus | null> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication) {
      return null;
    }

    const dailyUsage = await this.calculateDailyUsage(medicationId);
    const estimatedDaysRemaining = dailyUsage > 0 
      ? Math.floor(medication.currentSupply / dailyUsage)
      : Infinity;
    
    const estimatedRunOutDate = dailyUsage > 0 && isFinite(estimatedDaysRemaining)
      ? new Date(Date.now() + estimatedDaysRemaining * 24 * 60 * 60 * 1000)
      : null;

    return {
      medicationId: medication.id,
      medicationName: medication.name,
      currentSupply: medication.currentSupply,
      lowSupplyThreshold: medication.lowSupplyThreshold,
      isLowSupply: medication.isLowSupply(),
      estimatedDaysRemaining: isFinite(estimatedDaysRemaining) ? estimatedDaysRemaining : -1,
      estimatedRunOutDate,
      dailyUsage,
      lastRefillDate: medication.lastRefillDate,
    };
  }

  async getAllSupplyStatuses(userId: string): Promise<SupplyStatus[]> {
    const medications = await this.medicationRepo.findByUserId(userId);
    const statuses: SupplyStatus[] = [];

    for (const medication of medications) {
      if (medication.isActive) {
        const status = await this.getSupplyStatus(medication.id);
        if (status) {
          statuses.push(status);
        }
      }
    }

    return statuses;
  }

  async getLowSupplyMedications(userId: string): Promise<SupplyStatus[]> {
    const statuses = await this.getAllSupplyStatuses(userId);
    return statuses.filter(s => s.isLowSupply);
  }

  async recordRefill(
    userId: string,
    medicationId: string,
    quantity: number,
    options?: {
      pharmacyName?: string;
      cost?: number;
      notes?: string;
    }
  ): Promise<MedicationEntity | null> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication) {
      return null;
    }

    const previousSupply = medication.currentSupply;
    medication.currentSupply += quantity;
    medication.lastRefillDate = new Date();

    if (options?.pharmacyName) {
      medication.pharmacyName = options.pharmacyName;
    }

    // Add to history
    medication.addHistoryEntry({
      action: 'refill',
      previousValue: String(previousSupply),
      newValue: String(medication.currentSupply),
      changedBy: userId,
    });

    await this.medicationRepo.update(medicationId, userId, {
      currentSupply: medication.currentSupply,
      pharmacyName: medication.pharmacyName,
    });

    logger.info(`Recorded refill for medication ${medicationId}: +${quantity} units`);
    return medication;
  }

  async decrementSupply(userId: string, medicationId: string, amount: number = 1): Promise<number> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication) {
      return -1;
    }

    const newSupply = Math.max(0, medication.currentSupply - amount);
    await this.medicationRepo.update(medicationId, userId, { currentSupply: newSupply });

    // Check if now low supply and send notification
    if (newSupply <= medication.lowSupplyThreshold && medication.currentSupply > medication.lowSupplyThreshold) {
      await this.sendLowSupplyNotification(medication);
    }

    return newSupply;
  }

  async setSupply(userId: string, medicationId: string, quantity: number): Promise<MedicationEntity | null> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication) {
      return null;
    }

    const previousSupply = medication.currentSupply;
    
    medication.addHistoryEntry({
      action: 'supply_adjustment',
      previousValue: String(previousSupply),
      newValue: String(quantity),
      changedBy: userId,
    });

    await this.medicationRepo.update(medicationId, userId, {
      currentSupply: quantity,
    });

    medication.currentSupply = quantity;
    return medication;
  }

  async setLowSupplyThreshold(userId: string, medicationId: string, threshold: number): Promise<MedicationEntity | null> {
    return this.medicationRepo.update(medicationId, userId, { lowSupplyThreshold: threshold });
  }

  async calculateDailyUsage(medicationId: string): Promise<number> {
    const schedules = await this.scheduleRepo.findByMedicationId(medicationId);
    
    if (schedules.length === 0) {
      return 0;
    }

    let totalDailyDoses = 0;

    for (const schedule of schedules) {
      if (!schedule.isActive) continue;

      const timeSlots = schedule.getTimeSlots();
      const timesCount = timeSlots.length;
      
      const freqType = schedule.frequencyType as string;
      switch (freqType) {
        case 'daily':
          totalDailyDoses += timesCount;
          break;
        case 'weekly':
          // Average daily doses for weekly schedules
          const specificDays = schedule.getSpecificDays();
          const daysPerWeek = specificDays?.length || 1;
          totalDailyDoses += (timesCount * daysPerWeek) / 7;
          break;
        case 'monthly':
          // Monthly - roughly once per 30 days
          totalDailyDoses += timesCount / 30;
          break;
        case 'as_needed':
          // Estimate based on typical usage (configurable)
          totalDailyDoses += 0.5; // Assume half a dose per day on average
          break;
        case 'custom':
          // Custom frequency - use interval if available
          const intervalDays = schedule.frequencyInterval || 1;
          totalDailyDoses += timesCount / intervalDays;
          break;
        default:
          totalDailyDoses += timesCount;
      }
    }

    return totalDailyDoses;
  }

  async getRefillReminders(userId: string, daysAhead: number = 7): Promise<RefillReminder[]> {
    const statuses = await this.getAllSupplyStatuses(userId);
    const reminders: RefillReminder[] = [];

    for (const status of statuses) {
      if (status.estimatedDaysRemaining <= daysAhead && status.estimatedDaysRemaining >= 0) {
        const medication = await this.medicationRepo.findById(status.medicationId);
        if (medication) {
          reminders.push({
            medicationId: status.medicationId,
            medicationName: status.medicationName,
            currentSupply: status.currentSupply,
            daysRemaining: status.estimatedDaysRemaining,
            pharmacyName: medication.pharmacyName || undefined,
            pharmacyPhone: medication.pharmacyPhone || undefined,
            prescriptionNumber: medication.prescriptionNumber || undefined,
          });
        }
      }
    }

    // Sort by days remaining (most urgent first)
    reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return reminders;
  }

  async sendLowSupplyNotification(medication: MedicationEntity): Promise<void> {
    const status = await this.getSupplyStatus(medication.id);
    if (!status) return;

    await notificationService.sendFromTemplate(
      'REFILL_REMINDER',
      medication.userId,
      {
        medicationName: medication.name,
        remainingDoses: status.currentSupply.toString(),
      }
    );

    logger.info(`Sent low supply notification for medication ${medication.id}`);
  }

  async checkAndSendRefillReminders(userId: string): Promise<number> {
    const reminders = await this.getRefillReminders(userId, 7);
    let sentCount = 0;

    for (const reminder of reminders) {
      if (reminder.daysRemaining <= 3) {
        await notificationService.sendFromTemplate(
          'REFILL_REMINDER',
          userId,
          {
            medicationName: reminder.medicationName,
            remainingDoses: reminder.currentSupply.toString(),
          }
        );
        sentCount++;
      }
    }

    return sentCount;
  }

  // Get supply history for a medication
  async getSupplyHistory(medicationId: string): Promise<Array<Record<string, unknown>>> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication) {
      return [];
    }

    const history = medication.getHistory();
    return history.filter(
      entry => entry.type === 'refill' || entry.type === 'supply_adjustment'
    );
  }
}

// Factory function
export function createSupplyService(): SupplyService {
  const { medicationRepository } = require('../repositories/medication.repository');
  const { scheduleRepository } = require('../repositories/schedule.repository');
  return new SupplyService(medicationRepository, scheduleRepository);
}

export const supplyService = createSupplyService();
