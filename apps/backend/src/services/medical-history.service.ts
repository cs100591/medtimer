import { MedicationRepository } from '../repositories/medication.repository';
import { logger } from '../utils/logger';

export interface MedicationHistoryEntry {
  id: string;
  medicationId: string;
  userId: string;
  eventType: 'started' | 'stopped' | 'dosage_changed' | 'frequency_changed' | 'paused' | 'resumed';
  eventDate: Date;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  prescribedBy?: string;
  notes?: string;
  effectivenessRating?: number; // 1-5
  sideEffectsReported?: string[];
}

export interface MedicationTimeline {
  medicationId: string;
  medicationName: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  totalDuration: number; // days
  events: MedicationHistoryEntry[];
  effectivenessAverage?: number;
  reportedSideEffects: string[];
}

export interface ProviderMedicationList {
  patientName: string;
  generatedAt: Date;
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    prescriber?: string;
    purpose?: string;
  }>;
  pastMedications: Array<{
    name: string;
    dosage: string;
    startDate: string;
    endDate: string;
    stopReason?: string;
  }>;
  allergies: string[];
  notes?: string;
}

export class MedicalHistoryService {
  private historyEntries: Map<string, MedicationHistoryEntry[]> = new Map();

  constructor(private medicationRepo: MedicationRepository) {}

  async addHistoryEntry(
    entry: Omit<MedicationHistoryEntry, 'id'>
  ): Promise<MedicationHistoryEntry> {
    const newEntry: MedicationHistoryEntry = {
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    const key = entry.medicationId;
    const entries = this.historyEntries.get(key) || [];
    entries.push(newEntry);
    this.historyEntries.set(key, entries);

    // Also update medication entity history
    const medication = await this.medicationRepo.findById(entry.medicationId);
    if (medication) {
      medication.addHistoryEntry({
        action: entry.eventType,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        changedBy: entry.userId,
      });
      await this.medicationRepo.update(entry.medicationId, entry.userId, {});
    }

    logger.info(`Added history entry for medication ${entry.medicationId}: ${entry.eventType}`);
    return newEntry;
  }

  async getMedicationHistory(medicationId: string): Promise<MedicationHistoryEntry[]> {
    return this.historyEntries.get(medicationId) || [];
  }

  async getMedicationTimeline(medicationId: string): Promise<MedicationTimeline | null> {
    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication) return null;

    const entries = await this.getMedicationHistory(medicationId);
    const sortedEntries = entries.sort(
      (a, b) => a.eventDate.getTime() - b.eventDate.getTime()
    );

    const endDate = medication.endDate || (medication.isActive ? undefined : new Date());
    const totalDuration = endDate
      ? Math.ceil((endDate.getTime() - medication.startDate.getTime()) / (24 * 60 * 60 * 1000))
      : Math.ceil((Date.now() - medication.startDate.getTime()) / (24 * 60 * 60 * 1000));

    // Calculate average effectiveness
    const ratings = entries
      .filter(e => e.effectivenessRating !== undefined)
      .map(e => e.effectivenessRating!);
    const effectivenessAverage = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : undefined;

    // Collect all reported side effects
    const reportedSideEffects = new Set<string>();
    for (const entry of entries) {
      if (entry.sideEffectsReported) {
        for (const effect of entry.sideEffectsReported) {
          reportedSideEffects.add(effect);
        }
      }
    }

    return {
      medicationId,
      medicationName: medication.name,
      startDate: medication.startDate,
      endDate,
      isActive: medication.isActive,
      totalDuration,
      events: sortedEntries,
      effectivenessAverage,
      reportedSideEffects: Array.from(reportedSideEffects),
    };
  }

  async getUserMedicationTimelines(userId: string): Promise<MedicationTimeline[]> {
    const medications = await this.medicationRepo.findByUserId(userId);
    const timelines: MedicationTimeline[] = [];

    for (const medication of medications) {
      const timeline = await this.getMedicationTimeline(medication.id);
      if (timeline) {
        timelines.push(timeline);
      }
    }

    return timelines.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  async generateProviderMedicationList(
    userId: string,
    patientName: string
  ): Promise<ProviderMedicationList> {
    const medications = await this.medicationRepo.findByUserId(userId);

    const currentMedications = medications
      .filter(m => m.isActive)
      .map(m => ({
        name: m.name,
        dosage: `${m.dosageAmount} ${m.dosageUnit}`,
        frequency: 'As prescribed', // Would come from schedule
        startDate: m.startDate.toISOString().split('T')[0],
        prescriber: undefined, // Would come from history
        purpose: m.purpose || undefined,
      }));

    const pastMedications = medications
      .filter(m => !m.isActive && m.endDate)
      .map(m => {
        const history = m.getHistory();
        const stopEntry = history.find((h: any) => h.type === 'stopped');
        return {
          name: m.name,
          dosage: `${m.dosageAmount} ${m.dosageUnit}`,
          startDate: m.startDate.toISOString().split('T')[0],
          endDate: m.endDate!.toISOString().split('T')[0],
          stopReason: (stopEntry as any)?.reason as string | undefined,
        };
      });

    return {
      patientName,
      generatedAt: new Date(),
      currentMedications,
      pastMedications,
      allergies: [], // Would come from user profile
    };
  }

  async recordMedicationStart(
    medicationId: string,
    userId: string,
    options?: {
      prescribedBy?: string;
      reason?: string;
      notes?: string;
    }
  ): Promise<MedicationHistoryEntry> {
    return this.addHistoryEntry({
      medicationId,
      userId,
      eventType: 'started',
      eventDate: new Date(),
      prescribedBy: options?.prescribedBy,
      reason: options?.reason,
      notes: options?.notes,
    });
  }

  async recordMedicationStop(
    medicationId: string,
    userId: string,
    reason: string,
    options?: {
      effectivenessRating?: number;
      sideEffectsReported?: string[];
      notes?: string;
    }
  ): Promise<MedicationHistoryEntry> {
    // Update medication as inactive
    await this.medicationRepo.update(medicationId, userId, {
      isActive: false,
      endDate: new Date(),
    });

    return this.addHistoryEntry({
      medicationId,
      userId,
      eventType: 'stopped',
      eventDate: new Date(),
      reason,
      effectivenessRating: options?.effectivenessRating,
      sideEffectsReported: options?.sideEffectsReported,
      notes: options?.notes,
    });
  }

  async recordDosageChange(
    medicationId: string,
    userId: string,
    previousDosage: string,
    newDosage: string,
    reason?: string
  ): Promise<MedicationHistoryEntry> {
    return this.addHistoryEntry({
      medicationId,
      userId,
      eventType: 'dosage_changed',
      eventDate: new Date(),
      previousValue: previousDosage,
      newValue: newDosage,
      reason,
    });
  }

  async recordEffectivenessRating(
    medicationId: string,
    userId: string,
    rating: number,
    notes?: string
  ): Promise<MedicationHistoryEntry> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    return this.addHistoryEntry({
      medicationId,
      userId,
      eventType: 'dosage_changed', // Using as a general update event
      eventDate: new Date(),
      effectivenessRating: rating,
      notes,
    });
  }

  async reportSideEffect(
    medicationId: string,
    userId: string,
    sideEffects: string[],
    severity?: 'mild' | 'moderate' | 'severe',
    notes?: string
  ): Promise<MedicationHistoryEntry> {
    return this.addHistoryEntry({
      medicationId,
      userId,
      eventType: 'dosage_changed', // Using as a general update event
      eventDate: new Date(),
      sideEffectsReported: sideEffects,
      notes: severity ? `Severity: ${severity}. ${notes || ''}` : notes,
    });
  }

  async getEffectivenessHistory(medicationId: string): Promise<Array<{
    date: Date;
    rating: number;
    notes?: string;
  }>> {
    const entries = await this.getMedicationHistory(medicationId);
    return entries
      .filter(e => e.effectivenessRating !== undefined)
      .map(e => ({
        date: e.eventDate,
        rating: e.effectivenessRating!,
        notes: e.notes,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getSideEffectsSummary(userId: string): Promise<Map<string, string[]>> {
    const medications = await this.medicationRepo.findByUserId(userId);
    const summary = new Map<string, string[]>();

    for (const medication of medications) {
      const timeline = await this.getMedicationTimeline(medication.id);
      if (timeline && timeline.reportedSideEffects.length > 0) {
        summary.set(medication.name, timeline.reportedSideEffects);
      }
    }

    return summary;
  }
}

// Factory function
export function createMedicalHistoryService(): MedicalHistoryService {
  const { medicationRepository } = require('../repositories/medication.repository');
  return new MedicalHistoryService(medicationRepository);
}

export const medicalHistoryService = createMedicalHistoryService();
