import { CaregiverPermission, AccessLevel } from '../enums';

export interface CaregiverAccess {
  id: string;
  caregiverId: string;
  patientId: string;
  caregiverEmail: string;
  caregiverName: string;
  permissions: CaregiverPermission[];
  accessLevel: AccessLevel;
  isEmergencyContact: boolean;
  isActive: boolean;
  invitedAt: Date;
  acceptedAt?: Date;
  expiresAt?: Date;
  lastAccessAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaregiverInvitation {
  id: string;
  patientId: string;
  email: string;
  name: string;
  permissions: CaregiverPermission[];
  accessLevel: AccessLevel;
  isEmergencyContact: boolean;
  token: string;
  expiresAt: Date;
  isAccepted: boolean;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  caregiverId: string;
  patientId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface CaregiverNotification {
  id: string;
  caregiverId: string;
  patientId: string;
  type: 'missed_medication' | 'emergency' | 'low_adherence' | 'refill_needed';
  title: string;
  message: string;
  medicationId?: string;
  medicationName?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface CreateCaregiverAccessInput {
  email: string;
  name: string;
  permissions: CaregiverPermission[];
  accessLevel: AccessLevel;
  isEmergencyContact?: boolean;
  expiresAt?: Date;
}

export interface UpdateCaregiverAccessInput {
  permissions?: CaregiverPermission[];
  accessLevel?: AccessLevel;
  isEmergencyContact?: boolean;
  isActive?: boolean;
  expiresAt?: Date;
}
