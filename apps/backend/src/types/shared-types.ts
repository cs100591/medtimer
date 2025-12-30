// Local copy of shared types for standalone deployment
// This allows the backend to be deployed independently without the monorepo structure

export enum DosageUnit {
  PILL = 'pill',
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  ML = 'ml',
  MG = 'mg',
  DROPS = 'drops',
  PUFF = 'puff',
  PATCH = 'patch',
  INJECTION = 'injection',
  TEASPOON = 'teaspoon',
  TABLESPOON = 'tablespoon',
}

export enum MedicationForm {
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  LIQUID = 'liquid',
  INJECTION = 'injection',
  INHALER = 'inhaler',
  PATCH = 'patch',
  CREAM = 'cream',
  DROPS = 'drops',
  SUPPOSITORY = 'suppository',
  POWDER = 'powder',
}

export enum FrequencyType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  AS_NEEDED = 'as_needed',
  CUSTOM = 'custom',
}

export enum DurationType {
  ONGOING = 'ongoing',
  FIXED_TERM = 'fixed_term',
  CYCLE = 'cycle',
}

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export enum AdherenceStatus {
  TAKEN = 'taken',
  SKIPPED = 'skipped',
  SNOOZED = 'snoozed',
  MISSED = 'missed',
  PENDING = 'pending',
}

export enum EscalationLevel {
  GENTLE = 'gentle',
  REPEAT = 'repeat',
  SMS = 'sms',
  CALL = 'call',
  EMERGENCY = 'emergency',
}

export enum CaregiverPermission {
  VIEW_MEDICATIONS = 'view_medications',
  VIEW_SCHEDULES = 'view_schedules',
  VIEW_ADHERENCE = 'view_adherence',
  VIEW_REPORTS = 'view_reports',
  MANAGE_MEDICATIONS = 'manage_medications',
  MANAGE_SCHEDULES = 'manage_schedules',
}

export enum AccessLevel {
  VIEW_ONLY = 'view_only',
  CO_MANAGE = 'co_manage',
}

export enum CaregiverStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export enum NotificationType {
  REMINDER = 'reminder',
  ESCALATION = 'escalation',
  REFILL = 'refill',
  INTERACTION_WARNING = 'interaction_warning',
  CAREGIVER_ALERT = 'caregiver_alert',
  EMERGENCY = 'emergency',
  EDUCATIONAL = 'educational',
}

export enum InteractionSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CONTRAINDICATED = 'contraindicated',
}

export enum SupportedLanguage {
  EN = 'en',
  ES = 'es',
  ZH = 'zh',
  HI = 'hi',
  AR = 'ar',
  FR = 'fr',
  PT = 'pt',
  RU = 'ru',
  JA = 'ja',
  DE = 'de',
}

export enum MeasurementUnit {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
}

export enum TimeFormat {
  TWELVE_HOUR = '12h',
  TWENTY_FOUR_HOUR = '24h',
}

export enum DateFormat {
  MDY = 'MM/DD/YYYY',
  DMY = 'DD/MM/YYYY',
  YMD = 'YYYY-MM-DD',
}
