import { FrequencyType, DurationType, DayOfWeek, EscalationLevel } from '../enums';

export interface TimeSlot {
  hour: number;
  minute: number;
  label?: string;
}

export interface CustomCycle {
  activeDays: number;
  breakDays: number;
  startDate: Date;
}

export interface FrequencyPattern {
  type: FrequencyType;
  interval: number;
  timesPerDay: number;
  specificDays?: DayOfWeek[];
  timeSlots: TimeSlot[];
  customCycle?: CustomCycle;
}

export interface DurationPattern {
  type: DurationType;
  startDate: Date;
  endDate?: Date;
  totalDays?: number;
  cycle?: CustomCycle;
}

export interface EscalationRule {
  level: EscalationLevel;
  delayMinutes: number;
  maxAttempts: number;
  notifyCaregiver: boolean;
}

export interface TimingPreferences {
  withFood: boolean;
  beforeMeals: boolean;
  afterMeals: boolean;
  atBedtime: boolean;
  onWaking: boolean;
  emptyStomach: boolean;
  customInstructions?: string;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  userId: string;
  frequency: FrequencyPattern;
  duration: DurationPattern;
  timing: TimingPreferences;
  escalationRules: EscalationRule[];
  isActive: boolean;
  isPaused: boolean;
  pausedUntil?: Date;
  lastReminderAt?: Date;
  nextReminderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledReminder {
  id: string;
  scheduleId: string;
  medicationId: string;
  userId: string;
  scheduledTime: Date;
  escalationLevel: EscalationLevel;
  attemptCount: number;
  isDelivered: boolean;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface CreateScheduleInput {
  medicationId: string;
  frequency: FrequencyPattern;
  duration: DurationPattern;
  timing?: Partial<TimingPreferences>;
  escalationRules?: EscalationRule[];
}

export interface UpdateScheduleInput {
  frequency?: Partial<FrequencyPattern>;
  duration?: Partial<DurationPattern>;
  timing?: Partial<TimingPreferences>;
  escalationRules?: EscalationRule[];
  isActive?: boolean;
  isPaused?: boolean;
  pausedUntil?: Date;
}
