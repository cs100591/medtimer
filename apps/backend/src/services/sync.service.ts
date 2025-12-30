import { logger } from '../utils/logger';

export interface SyncOperation {
  id: string;
  userId: string;
  deviceId: string;
  entityType: 'medication' | 'schedule' | 'adherence' | 'settings';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: Date;
  version: number;
  synced: boolean;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: SyncOperation;
  serverVersion: SyncOperation;
  resolvedAt?: Date;
  resolution?: 'local' | 'server' | 'merged';
}

export interface DeviceInfo {
  deviceId: string;
  userId: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  lastSyncAt?: Date;
  pushToken?: string;
}

export interface SyncStatus {
  userId: string;
  deviceId: string;
  lastSyncAt: Date;
  pendingOperations: number;
  conflicts: number;
  isOnline: boolean;
}

export class SyncService {
  private operations: Map<string, SyncOperation[]> = new Map();
  private conflicts: Map<string, SyncConflict[]> = new Map();
  private devices: Map<string, DeviceInfo[]> = new Map();
  private entityVersions: Map<string, number> = new Map();

  async registerDevice(deviceInfo: DeviceInfo): Promise<DeviceInfo> {
    const userDevices = this.devices.get(deviceInfo.userId) || [];
    const existingIndex = userDevices.findIndex(d => d.deviceId === deviceInfo.deviceId);

    if (existingIndex >= 0) {
      userDevices[existingIndex] = { ...userDevices[existingIndex], ...deviceInfo };
    } else {
      userDevices.push(deviceInfo);
    }

    this.devices.set(deviceInfo.userId, userDevices);
    logger.info(`Registered device ${deviceInfo.deviceId} for user ${deviceInfo.userId}`);

    return deviceInfo;
  }

  async unregisterDevice(userId: string, deviceId: string): Promise<boolean> {
    const userDevices = this.devices.get(userId) || [];
    const index = userDevices.findIndex(d => d.deviceId === deviceId);

    if (index === -1) return false;

    userDevices.splice(index, 1);
    this.devices.set(userId, userDevices);

    return true;
  }

  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    return this.devices.get(userId) || [];
  }

  async pushOperation(operation: Omit<SyncOperation, 'id' | 'synced'>): Promise<SyncOperation> {
    const entityKey = `${operation.entityType}:${operation.entityId}`;
    const currentVersion = this.entityVersions.get(entityKey) || 0;

    const syncOp: SyncOperation = {
      ...operation,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      version: currentVersion + 1,
      synced: false,
    };

    const userOps = this.operations.get(operation.userId) || [];
    userOps.push(syncOp);
    this.operations.set(operation.userId, userOps);

    // Update entity version
    this.entityVersions.set(entityKey, syncOp.version);

    logger.info(`Pushed sync operation ${syncOp.id} for ${operation.entityType}:${operation.entityId}`);
    return syncOp;
  }

  async pullOperations(
    userId: string,
    deviceId: string,
    since?: Date
  ): Promise<SyncOperation[]> {
    const userOps = this.operations.get(userId) || [];
    
    let relevantOps = userOps.filter(op => op.deviceId !== deviceId);
    
    if (since) {
      relevantOps = relevantOps.filter(op => op.timestamp > since);
    }

    return relevantOps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async markSynced(operationIds: string[]): Promise<number> {
    let count = 0;

    for (const [userId, ops] of this.operations) {
      for (const op of ops) {
        if (operationIds.includes(op.id) && !op.synced) {
          op.synced = true;
          count++;
        }
      }
    }

    return count;
  }

  async detectConflicts(
    userId: string,
    incomingOps: SyncOperation[]
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];
    const userOps = this.operations.get(userId) || [];

    for (const incoming of incomingOps) {
      const entityKey = `${incoming.entityType}:${incoming.entityId}`;
      const serverVersion = this.entityVersions.get(entityKey) || 0;

      // Check for version conflict
      if (incoming.version <= serverVersion) {
        const serverOp = userOps.find(
          op => op.entityType === incoming.entityType && 
                op.entityId === incoming.entityId &&
                op.version === serverVersion
        );

        if (serverOp && serverOp.deviceId !== incoming.deviceId) {
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entityType: incoming.entityType,
            entityId: incoming.entityId,
            localVersion: incoming,
            serverVersion: serverOp,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      const userConflicts = this.conflicts.get(userId) || [];
      userConflicts.push(...conflicts);
      this.conflicts.set(userId, userConflicts);
    }

    return conflicts;
  }

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'server' | 'merged',
    mergedData?: Record<string, unknown>
  ): Promise<SyncConflict | null> {
    for (const [userId, conflicts] of this.conflicts) {
      const conflict = conflicts.find(c => c.id === conflictId);
      if (conflict) {
        conflict.resolvedAt = new Date();
        conflict.resolution = resolution;

        // Apply resolution
        if (resolution === 'local') {
          await this.applyOperation(conflict.localVersion);
        } else if (resolution === 'server') {
          // Server version is already applied
        } else if (resolution === 'merged' && mergedData) {
          const mergedOp: SyncOperation = {
            ...conflict.localVersion,
            data: mergedData,
            version: Math.max(conflict.localVersion.version, conflict.serverVersion.version) + 1,
          };
          await this.applyOperation(mergedOp);
        }

        logger.info(`Resolved conflict ${conflictId} with ${resolution}`);
        return conflict;
      }
    }

    return null;
  }

  async getUnresolvedConflicts(userId: string): Promise<SyncConflict[]> {
    const conflicts = this.conflicts.get(userId) || [];
    return conflicts.filter(c => !c.resolvedAt);
  }

  async getSyncStatus(userId: string, deviceId: string): Promise<SyncStatus> {
    const userOps = this.operations.get(userId) || [];
    const pendingOps = userOps.filter(op => !op.synced && op.deviceId === deviceId);
    const unresolvedConflicts = await this.getUnresolvedConflicts(userId);

    const devices = await this.getUserDevices(userId);
    const device = devices.find(d => d.deviceId === deviceId);

    return {
      userId,
      deviceId,
      lastSyncAt: device?.lastSyncAt || new Date(0),
      pendingOperations: pendingOps.length,
      conflicts: unresolvedConflicts.length,
      isOnline: true, // Would be determined by actual connectivity
    };
  }

  async performFullSync(
    userId: string,
    deviceId: string,
    localOperations: SyncOperation[]
  ): Promise<{
    applied: SyncOperation[];
    conflicts: SyncConflict[];
    status: SyncStatus;
  }> {
    // Detect conflicts
    const conflicts = await this.detectConflicts(userId, localOperations);

    // Get operations to apply (excluding conflicting ones)
    const conflictingEntityIds = new Set(conflicts.map(c => c.entityId));
    const toApply = localOperations.filter(op => !conflictingEntityIds.has(op.entityId));

    // Apply non-conflicting operations
    for (const op of toApply) {
      await this.pushOperation(op);
    }

    // Update device last sync time
    const devices = this.devices.get(userId) || [];
    const device = devices.find(d => d.deviceId === deviceId);
    if (device) {
      device.lastSyncAt = new Date();
    }

    const status = await this.getSyncStatus(userId, deviceId);

    logger.info(`Full sync completed for user ${userId}, device ${deviceId}`);
    return { applied: toApply, conflicts, status };
  }

  private async applyOperation(operation: SyncOperation): Promise<void> {
    const entityKey = `${operation.entityType}:${operation.entityId}`;
    this.entityVersions.set(entityKey, operation.version);

    // In production, this would update the actual database
    logger.info(`Applied operation ${operation.id} for ${entityKey}`);
  }

  // Offline support helpers
  async getOfflineQueue(userId: string, deviceId: string): Promise<SyncOperation[]> {
    const userOps = this.operations.get(userId) || [];
    return userOps.filter(op => op.deviceId === deviceId && !op.synced);
  }

  async clearOfflineQueue(userId: string, deviceId: string): Promise<number> {
    const userOps = this.operations.get(userId) || [];
    const toRemove = userOps.filter(op => op.deviceId === deviceId && op.synced);
    
    const remaining = userOps.filter(op => !(op.deviceId === deviceId && op.synced));
    this.operations.set(userId, remaining);

    return toRemove.length;
  }
}

export const syncService = new SyncService();
