// Core entity types
export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  language: string;
  timezone: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface UserPreferences {
  voiceEnabled: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'normal' | 'large' | 'extraLarge';
  notificationsEnabled: boolean;
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  genericName?: string;
  dosage: string;
  form: MedicationForm;
  instructions?: string;
  isCritical: boolean;
  isActive: boolean;
  currentSupply?: number;
  lowSupplyThreshold?: number;
  costPerUnit?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export type MedicationForm = 
  | 'tablet' | 'capsule' | 'liquid' | 'injection' 
  | 'inhaler' | 'cream' | 'drops' | 'patch';

export interface Schedule {
  id: string;
  medicationId: string;
  frequencyType: FrequencyType;
  times: string[];
  daysOfWeek?: number[];
  intervalDays?: number;
  durationType: DurationType;
  endDate?: string;
  totalDays?: number;
  cycleDaysOn?: number;
  cycleDaysOff?: number;
  isActive: boolean;
  createdAt: string;
}

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'asNeeded' | 'custom';
export type DurationType = 'ongoing' | 'fixedDays' | 'untilDate' | 'cycles';

export interface AdherenceRecord {
  id: string;
  medicationId: string;
  scheduleId: string;
  scheduledTime: string;
  actualTime?: string;
  status: AdherenceStatus;
  notes?: string;
  createdAt: string;
}

export type AdherenceStatus = 'taken' | 'skipped' | 'snoozed' | 'missed';

export interface Reminder {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  status: 'pending' | 'completed' | 'missed';
  isCritical: boolean;
}

export interface AdherenceStats {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  skippedDoses: number;
  adherenceRate: number;
  period: { start: string; end: string };
}
