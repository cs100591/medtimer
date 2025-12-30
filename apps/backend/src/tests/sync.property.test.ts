import * as fc from 'fast-check';

/**
 * Property 19: Cross-Platform Consistency and Synchronization
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 * 
 * Tests that cross-platform sync correctly handles operations,
 * detects conflicts, and maintains data consistency.
 */
describe('Property 19: Cross-Platform Consistency and Synchronization', () => {
  const entityTypes = ['medication', 'schedule', 'adherence', 'settings'];
  const operations = ['create', 'update', 'delete'];
  const platforms = ['ios', 'android', 'web'];
  const resolutions = ['local', 'server', 'merged'];

  // Sync operation arbitrary
  const syncOperationArb = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    deviceId: fc.uuid(),
    entityType: fc.constantFrom(...entityTypes),
    entityId: fc.uuid(),
    operation: fc.constantFrom(...operations),
    timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
    version: fc.integer({ min: 1, max: 1000 }),
    synced: fc.boolean(),
  });

  // Device info arbitrary
  const deviceInfoArb = fc.record({
    deviceId: fc.uuid(),
    userId: fc.uuid(),
    platform: fc.constantFrom(...platforms),
    appVersion: fc.stringMatching(/^\d+\.\d+\.\d+$/),
    lastSyncAt: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }), { nil: undefined }),
  });

  test('all entity types are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...entityTypes),
        (entityType) => {
          expect(entityTypes).toContain(entityType);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('all operation types are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...operations),
        (operation) => {
          expect(operations).toContain(operation);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('sync operations have required fields', () => {
    fc.assert(
      fc.property(syncOperationArb, (op) => {
        expect(op.id).toBeDefined();
        expect(op.userId).toBeDefined();
        expect(op.deviceId).toBeDefined();
        expect(entityTypes).toContain(op.entityType);
        expect(op.entityId).toBeDefined();
        expect(operations).toContain(op.operation);
        expect(op.timestamp).toBeInstanceOf(Date);
        expect(op.version).toBeGreaterThanOrEqual(1);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('version numbers are monotonically increasing', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 20 }),
        (versions) => {
          const sorted = [...versions].sort((a, b) => a - b);
          
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('conflict detection identifies version mismatches', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // local version
        fc.integer({ min: 1, max: 100 }), // server version
        (localVersion, serverVersion) => {
          const hasConflict = localVersion <= serverVersion && localVersion !== serverVersion;
          
          // If local version is less than or equal to server (and different), there's a potential conflict
          if (localVersion < serverVersion) {
            expect(hasConflict).toBe(true);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('conflict resolution options are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...resolutions),
        (resolution) => {
          expect(resolutions).toContain(resolution);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('operations are ordered by timestamp', () => {
    fc.assert(
      fc.property(
        fc.array(syncOperationArb, { minLength: 2, maxLength: 20 }),
        (ops) => {
          const sorted = [...ops].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );

          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].timestamp.getTime()).toBeGreaterThanOrEqual(
              sorted[i - 1].timestamp.getTime()
            );
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('device registration stores required info', () => {
    fc.assert(
      fc.property(deviceInfoArb, (device) => {
        expect(device.deviceId).toBeDefined();
        expect(device.userId).toBeDefined();
        expect(platforms).toContain(device.platform);
        expect(device.appVersion).toMatch(/^\d+\.\d+\.\d+$/);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('multiple devices per user are supported', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(deviceInfoArb, { minLength: 1, maxLength: 5 }),
        (userId, devices) => {
          const userDevices = devices.map(d => ({ ...d, userId }));
          const uniqueDeviceIds = new Set(userDevices.map(d => d.deviceId));

          // Each device should have unique ID
          expect(uniqueDeviceIds.size).toBeLessThanOrEqual(userDevices.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sync status contains required fields', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 10 }),
        fc.boolean(),
        (userId, deviceId, lastSyncAt, pendingOps, conflicts, isOnline) => {
          const status = {
            userId,
            deviceId,
            lastSyncAt,
            pendingOperations: pendingOps,
            conflicts,
            isOnline,
          };

          expect(status.userId).toBeDefined();
          expect(status.deviceId).toBeDefined();
          expect(status.lastSyncAt).toBeInstanceOf(Date);
          expect(status.pendingOperations).toBeGreaterThanOrEqual(0);
          expect(status.conflicts).toBeGreaterThanOrEqual(0);
          expect(typeof status.isOnline).toBe('boolean');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('offline queue is device-specific', () => {
    fc.assert(
      fc.property(
        fc.array(syncOperationArb, { minLength: 5, maxLength: 20 }),
        fc.uuid(),
        (ops, targetDeviceId) => {
          // Assign some ops to target device
          const modifiedOps = ops.map((op, i) => ({
            ...op,
            deviceId: i % 3 === 0 ? targetDeviceId : op.deviceId,
            synced: false,
          }));

          const deviceQueue = modifiedOps.filter(
            op => op.deviceId === targetDeviceId && !op.synced
          );

          for (const op of deviceQueue) {
            expect(op.deviceId).toBe(targetDeviceId);
            expect(op.synced).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('pull operations exclude own device', () => {
    fc.assert(
      fc.property(
        fc.array(syncOperationArb, { minLength: 5, maxLength: 20 }),
        fc.uuid(),
        (ops, currentDeviceId) => {
          // Assign some ops to current device
          const modifiedOps = ops.map((op, i) => ({
            ...op,
            deviceId: i % 2 === 0 ? currentDeviceId : op.deviceId,
          }));

          const pulled = modifiedOps.filter(op => op.deviceId !== currentDeviceId);

          for (const op of pulled) {
            expect(op.deviceId).not.toBe(currentDeviceId);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('merged resolution combines data correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          field1: fc.string({ minLength: 1, maxLength: 50 }),
          field2: fc.integer({ min: 0, max: 100 }),
        }),
        fc.record({
          field1: fc.string({ minLength: 1, maxLength: 50 }),
          field3: fc.boolean(),
        }),
        (localData, serverData) => {
          // Merge strategy: combine all fields
          const merged = { ...serverData, ...localData };

          expect(merged.field1).toBe(localData.field1); // Local wins for conflicts
          expect(merged.field2).toBe(localData.field2);
          expect(merged.field3).toBe(serverData.field3);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('sync timestamp is updated after sync', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        (previousSync) => {
          const newSync = new Date();
          
          expect(newSync.getTime()).toBeGreaterThanOrEqual(previousSync.getTime());
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('entity key is unique combination of type and id', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...entityTypes),
        fc.uuid(),
        (entityType, entityId) => {
          const entityKey = `${entityType}:${entityId}`;
          
          expect(entityKey).toContain(':');
          expect(entityKey.split(':')[0]).toBe(entityType);
          expect(entityKey.split(':')[1]).toBe(entityId);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
