import { SupportedLanguage, MeasurementUnit, TimeFormat, DateFormat } from '../enums';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface LocalizationConfig {
  language: SupportedLanguage;
  region: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  measurementUnit: MeasurementUnit;
  timezone: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  escalationEnabled: boolean;
}

export interface PrivacySettings {
  shareWithCaregivers: boolean;
  shareWithHealthApps: boolean;
  analyticsEnabled: boolean;
}

export interface AccessibilitySettings {
  highContrastMode: boolean;
  largeText: boolean;
  fontSize: number;
  voiceEnabled: boolean;
  hapticFeedback: boolean;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  copayAmount?: number;
}

export interface UserPreferences {
  localization: LocalizationConfig;
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

export interface UserHealthInfo {
  allergies: string[];
  conditions: string[];
  bloodType?: string;
  insuranceInfo?: InsuranceInfo;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  phone?: string;
  emergencyContacts: EmergencyContact[];
}

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  profile: UserProfile;
  preferences: UserPreferences;
  healthInfo?: UserHealthInfo;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  profile: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserInput {
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  healthInfo?: Partial<UserHealthInfo>;
}
