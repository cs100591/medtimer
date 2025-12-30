import { 
  User, 
  Medication, 
  MedicationSchedule, 
  AdherenceRecord,
  AdherenceStats,
  WeeklyAdherenceReport,
  MonthlyAdherenceReport,
  CaregiverAccess,
  CaregiverNotification,
  DrugInteraction,
} from '../index';

// Base Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// Pagination Response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Auth Responses
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends ApiResponse<{
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}> {}

export interface RegisterResponse extends LoginResponse {}

export interface RefreshTokenResponse extends ApiResponse<AuthTokens> {}

// User Responses
export interface UserResponse extends ApiResponse<Omit<User, 'passwordHash'>> {}

// Medication Responses
export interface MedicationResponse extends ApiResponse<Medication> {}
export interface MedicationsResponse extends PaginatedResponse<Medication> {}

export interface MedicationSearchResult {
  id?: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  ndc?: string;
  rxcui?: string;
  form?: string;
  strength?: string;
}

export interface MedicationSearchResponse extends ApiResponse<MedicationSearchResult[]> {}

export interface BarcodeScanResponse extends ApiResponse<{
  found: boolean;
  medication?: MedicationSearchResult;
  suggestions?: MedicationSearchResult[];
}> {}

export interface InteractionCheckResponse extends ApiResponse<{
  hasInteractions: boolean;
  interactions: DrugInteraction[];
  warnings: string[];
}> {}

// Schedule Responses
export interface ScheduleResponse extends ApiResponse<MedicationSchedule> {}
export interface SchedulesResponse extends PaginatedResponse<MedicationSchedule> {}

// Adherence Responses
export interface AdherenceResponse extends ApiResponse<AdherenceRecord> {}
export interface AdherenceListResponse extends PaginatedResponse<AdherenceRecord> {}

export interface AdherenceStatsResponse extends ApiResponse<AdherenceStats> {}
export interface WeeklyReportResponse extends ApiResponse<WeeklyAdherenceReport> {}
export interface MonthlyReportResponse extends ApiResponse<MonthlyAdherenceReport> {}

// Caregiver Responses
export interface CaregiverAccessResponse extends ApiResponse<CaregiverAccess> {}
export interface CaregiversResponse extends PaginatedResponse<CaregiverAccess> {}

export interface CaregiverNotificationsResponse extends PaginatedResponse<CaregiverNotification> {}

export interface InvitationResponse extends ApiResponse<{
  invitationId: string;
  expiresAt: string;
}> {}

// Export Responses
export interface ExportResponse extends ApiResponse<{
  downloadUrl: string;
  expiresAt: string;
  format: string;
  size: number;
}> {}

// Health Check Response
export interface HealthCheckResponse extends ApiResponse<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: {
    database: boolean;
    redis: boolean;
    notifications: boolean;
  };
}> {}
