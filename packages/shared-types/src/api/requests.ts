import { 
  CreateUserInput, 
  UpdateUserInput,
  CreateMedicationInput,
  UpdateMedicationInput,
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateAdherenceInput,
  UpdateAdherenceInput,
  CreateCaregiverAccessInput,
  UpdateCaregiverAccessInput,
} from '../index';

// Auth Requests
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends CreateUserInput {}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// User Requests
export interface UpdateProfileRequest extends UpdateUserInput {}

// Medication Requests
export interface CreateMedicationRequest extends CreateMedicationInput {}
export interface UpdateMedicationRequest extends UpdateMedicationInput {}

export interface MedicationSearchRequest {
  query: string;
  limit?: number;
}

export interface BarcodeScanRequest {
  barcode: string;
  barcodeType: 'ndc' | 'upc' | 'ean';
}

// Schedule Requests
export interface CreateScheduleRequest extends CreateScheduleInput {}
export interface UpdateScheduleRequest extends UpdateScheduleInput {}

// Adherence Requests
export interface LogAdherenceRequest extends CreateAdherenceInput {}
export interface UpdateAdherenceRequest extends UpdateAdherenceInput {}

export interface AdherenceReportRequest {
  startDate: string;
  endDate: string;
  medicationIds?: string[];
}

// Caregiver Requests
export interface InviteCaregiverRequest extends CreateCaregiverAccessInput {}
export interface UpdateCaregiverRequest extends UpdateCaregiverAccessInput {}

export interface AcceptInvitationRequest {
  token: string;
}

// Notification Requests
export interface UpdateNotificationPreferencesRequest {
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  escalationEnabled?: boolean;
}

// Export Requests
export interface ExportDataRequest {
  format: 'json' | 'csv' | 'pdf' | 'fhir';
  includeAdherence?: boolean;
  includeMedications?: boolean;
  includeSchedules?: boolean;
  startDate?: string;
  endDate?: string;
}

// Pagination
export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
