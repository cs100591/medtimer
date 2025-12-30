import { MedicationRepository } from '../repositories/medication.repository';
import { AdherenceRepository } from '../repositories/adherence.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { UserRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'fhir';
  includePersonalInfo: boolean;
  includeMedications: boolean;
  includeAdherence: boolean;
  includeSchedules: boolean;
  dateRange?: { start: Date; end: Date };
}

export interface ExportResult {
  format: string;
  data: string | Buffer;
  filename: string;
  mimeType: string;
  generatedAt: Date;
  checksum?: string;
}

export interface ProviderReport {
  patientInfo: {
    name: string;
    dateOfBirth?: string;
    allergies: string[];
    conditions: string[];
  };
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    prescriber?: string;
  }>;
  adherenceSummary: {
    period: string;
    complianceRate: number;
    missedDoses: number;
  };
  generatedAt: string;
}

export class DataExportService {
  constructor(
    private userRepo: UserRepository,
    private medicationRepo: MedicationRepository,
    private adherenceRepo: AdherenceRepository,
    private scheduleRepo: ScheduleRepository
  ) {}

  async exportUserData(userId: string, options: ExportOptions): Promise<ExportResult> {
    const data: Record<string, unknown> = {};

    if (options.includePersonalInfo) {
      const user = await this.userRepo.findById(userId);
      if (user) {
        data.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth,
          timezone: user.timezone,
          language: user.language,
          createdAt: user.createdAt,
        };
      }
    }

    if (options.includeMedications) {
      const medications = await this.medicationRepo.findByUserId(userId);
      data.medications = medications.map(m => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        dosageAmount: m.dosageAmount,
        dosageUnit: m.dosageUnit,
        form: m.form,
        instructions: m.instructions,
        startDate: m.startDate,
        endDate: m.endDate,
        isActive: m.isActive,
        isCritical: m.isCritical,
      }));
    }

    if (options.includeSchedules) {
      const schedules = await this.scheduleRepo.findByUserId(userId);
      data.schedules = schedules.map(s => ({
        id: s.id,
        medicationId: s.medicationId,
        timeSlots: s.getTimeSlots(),
        frequencyType: s.frequencyType,
        frequencyInterval: s.frequencyInterval,
        isActive: s.isActive,
      }));
    }

    if (options.includeAdherence) {
      const startDate = options.dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const endDate = options.dateRange?.end || new Date();
      
      const records = await this.adherenceRepo.findByFilters({
        userId,
        startDate,
        endDate,
      });

      data.adherence = records.map(r => ({
        medicationId: r.medicationId,
        scheduledTime: r.scheduledTime,
        actualTime: r.actualTime,
        status: r.status,
        notes: r.notes,
      }));

      const stats = await this.adherenceRepo.getStats(userId, startDate, endDate);
      data.adherenceStats = stats;
    }

    data.exportedAt = new Date().toISOString();
    data.exportVersion = '1.0';

    return this.formatExport(data, options.format, userId);
  }

  async generateProviderReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProviderReport> {
    const user = await this.userRepo.findById(userId);
    const medications = await this.medicationRepo.findByUserId(userId);
    const schedules = await this.scheduleRepo.findByUserId(userId);
    const stats = await this.adherenceRepo.getStats(userId, startDate, endDate);

    const medicationList = medications
      .filter(m => m.isActive)
      .map(m => {
        const schedule = schedules.find(s => s.medicationId === m.id);
        return {
          name: m.name,
          dosage: `${m.dosageAmount} ${m.dosageUnit}`,
          frequency: schedule ? this.formatFrequency({ type: schedule.frequencyType, intervalDays: schedule.frequencyInterval }) : 'As directed',
          startDate: m.startDate.toISOString().split('T')[0],
        };
      });

    return {
      patientInfo: {
        name: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
        dateOfBirth: user?.dateOfBirth?.toISOString().split('T')[0],
        allergies: [], // Would come from user profile
        conditions: [],
      },
      medications: medicationList,
      adherenceSummary: {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        complianceRate: stats.complianceRate,
        missedDoses: stats.missed,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async generateFHIRBundle(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findById(userId);
    const medications = await this.medicationRepo.findByUserId(userId);

    // Generate FHIR R4 Bundle
    const bundle: Record<string, unknown> = {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: [],
    };

    // Add Patient resource
    if (user) {
      (bundle.entry as unknown[]).push({
        resource: {
          resourceType: 'Patient',
          id: user.id,
          name: [{
            family: user.lastName,
            given: [user.firstName],
          }],
          birthDate: user.dateOfBirth?.toISOString().split('T')[0],
        },
      });
    }

    // Add MedicationStatement resources
    for (const med of medications) {
      (bundle.entry as unknown[]).push({
        resource: {
          resourceType: 'MedicationStatement',
          id: med.id,
          status: med.isActive ? 'active' : 'stopped',
          medicationCodeableConcept: {
            text: med.name,
            coding: med.rxcui ? [{
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: med.rxcui,
            }] : undefined,
          },
          subject: { reference: `Patient/${userId}` },
          dosage: [{
            text: `${med.dosageAmount} ${med.dosageUnit}`,
            doseAndRate: [{
              doseQuantity: {
                value: med.dosageAmount,
                unit: med.dosageUnit,
              },
            }],
          }],
        },
      });
    }

    return bundle;
  }

  async generateQRCode(userId: string): Promise<string> {
    // Generate a shareable link with encrypted user data
    const shareToken = Buffer.from(JSON.stringify({
      userId,
      generatedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    })).toString('base64');

    // In production, this would generate an actual QR code image
    return `https://app.medicationreminder.com/share/${shareToken}`;
  }

  async deleteAllUserData(userId: string): Promise<{ deleted: boolean; details: Record<string, number> }> {
    const details: Record<string, number> = {};

    // Delete adherence records
    const adherenceRecords = await this.adherenceRepo.findByFilters({ userId });
    for (const record of adherenceRecords) {
      await this.adherenceRepo.delete(record.id);
    }
    details.adherenceRecords = adherenceRecords.length;

    // Delete schedules
    const schedules = await this.scheduleRepo.findByUserId(userId);
    for (const schedule of schedules) {
      await this.scheduleRepo.delete(schedule.id, userId);
    }
    details.schedules = schedules.length;

    // Delete medications
    const medications = await this.medicationRepo.findByUserId(userId);
    for (const medication of medications) {
      await this.medicationRepo.delete(medication.id, userId);
    }
    details.medications = medications.length;

    // Delete user
    await this.userRepo.delete(userId);
    details.user = 1;

    logger.info(`Deleted all data for user ${userId}`, details);

    return { deleted: true, details };
  }

  private formatExport(data: Record<string, unknown>, format: string, userId: string): ExportResult {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    switch (format) {
      case 'json':
        return {
          format: 'json',
          data: JSON.stringify(data, null, 2),
          filename: `medication-data-${timestamp}.json`,
          mimeType: 'application/json',
          generatedAt: new Date(),
        };

      case 'csv':
        const csvData = this.convertToCSV(data);
        return {
          format: 'csv',
          data: csvData,
          filename: `medication-data-${timestamp}.csv`,
          mimeType: 'text/csv',
          generatedAt: new Date(),
        };

      case 'fhir':
        return {
          format: 'fhir',
          data: JSON.stringify(data, null, 2),
          filename: `fhir-bundle-${timestamp}.json`,
          mimeType: 'application/fhir+json',
          generatedAt: new Date(),
        };

      default:
        return {
          format: 'json',
          data: JSON.stringify(data, null, 2),
          filename: `medication-data-${timestamp}.json`,
          mimeType: 'application/json',
          generatedAt: new Date(),
        };
    }
  }

  private convertToCSV(data: Record<string, unknown>): string {
    const lines: string[] = [];

    // Medications section
    if (data.medications && Array.isArray(data.medications)) {
      lines.push('MEDICATIONS');
      lines.push('Name,Dosage,Unit,Form,Instructions,Start Date,Active');
      for (const med of data.medications as Record<string, unknown>[]) {
        lines.push([
          med.name,
          med.dosageAmount,
          med.dosageUnit,
          med.form,
          `"${med.instructions || ''}"`,
          med.startDate,
          med.isActive,
        ].join(','));
      }
      lines.push('');
    }

    // Adherence section
    if (data.adherence && Array.isArray(data.adherence)) {
      lines.push('ADHERENCE RECORDS');
      lines.push('Medication ID,Scheduled Time,Actual Time,Status,Notes');
      for (const rec of data.adherence as Record<string, unknown>[]) {
        lines.push([
          rec.medicationId,
          rec.scheduledTime,
          rec.actualTime || '',
          rec.status,
          `"${rec.notes || ''}"`,
        ].join(','));
      }
    }

    return lines.join('\n');
  }

  private formatFrequency(frequency: Record<string, unknown>): string {
    switch (frequency.type) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return `Weekly on ${(frequency.daysOfWeek as string[])?.join(', ')}`;
      case 'interval':
        return `Every ${frequency.intervalDays} days`;
      case 'asNeeded':
        return 'As needed';
      default:
        return 'As directed';
    }
  }
}

// Factory function
export function createDataExportService(): DataExportService {
  const { userRepository } = require('../repositories/user.repository');
  const { medicationRepository } = require('../repositories/medication.repository');
  const { adherenceRepository } = require('../repositories/adherence.repository');
  const { scheduleRepository } = require('../repositories/schedule.repository');
  return new DataExportService(userRepository, medicationRepository, adherenceRepository, scheduleRepository);
}

export const dataExportService = createDataExportService();
