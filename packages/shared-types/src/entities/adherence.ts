import { AdherenceStatus } from '../enums';

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

export interface AdherenceRecord {
  id: string;
  medicationId: string;
  scheduleId: string;
  userId: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: AdherenceStatus;
  notes?: string;
  location?: GeolocationData;
  method: 'manual' | 'auto' | 'dispenser' | 'voice';
  snoozeCount: number;
  snoozedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdherenceStats {
  totalScheduled: number;
  taken: number;
  skipped: number;
  missed: number;
  snoozed: number;
  complianceRate: number;
  averageDelayMinutes: number;
  streakDays: number;
}

export interface DailyAdherence {
  date: Date;
  scheduled: number;
  taken: number;
  skipped: number;
  missed: number;
  complianceRate: number;
}

export interface WeeklyAdherenceReport {
  startDate: Date;
  endDate: Date;
  dailyData: DailyAdherence[];
  overallStats: AdherenceStats;
  medicationBreakdown: MedicationAdherenceStats[];
}

export interface MonthlyAdherenceReport {
  month: number;
  year: number;
  weeklyData: WeeklyAdherenceReport[];
  overallStats: AdherenceStats;
  trends: AdherenceTrend[];
}

export interface MedicationAdherenceStats {
  medicationId: string;
  medicationName: string;
  stats: AdherenceStats;
}

export interface AdherenceTrend {
  period: string;
  complianceRate: number;
  change: number;
}

export interface CreateAdherenceInput {
  medicationId: string;
  scheduleId: string;
  scheduledTime: Date;
  status: AdherenceStatus;
  actualTime?: Date;
  notes?: string;
  location?: GeolocationData;
  method?: 'manual' | 'auto' | 'dispenser' | 'voice';
}

export interface UpdateAdherenceInput {
  status?: AdherenceStatus;
  actualTime?: Date;
  notes?: string;
  snoozedUntil?: Date;
}
