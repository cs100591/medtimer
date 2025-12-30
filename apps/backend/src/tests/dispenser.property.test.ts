import * as fc from 'fast-check';
import { DispenserService } from '../services/dispenser.service';

/**
 * Property 23: Smart Device Integration
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5
 * 
 * Tests that smart pill dispenser integration correctly:
 * - Supports multiple dispenser brands and connection types
 * - Auto-logs medications when dispensed
 * - Tracks dispenser supply levels
 * - Falls back to standard reminders on malfunction
 * - Handles device pairing and management
 */
describe('Property 23: Smart Device Integration', () => {
  let service: DispenserService;

  beforeEach(() => {
    service = new DispenserService();
  });

  // Arbitrary generators
  const deviceBrandArb = fc.constantFrom('hero', 'medminder', 'philips', 'generic');
  const connectionTypeArb = fc.constantFrom('bluetooth', 'wifi') as fc.Arbitrary<'bluetooth' | 'wifi'>;
  const userIdArb = fc.uuid();

  describe('14.1: Multiple dispenser brand support', () => {
    it('should register devices from any supported brand', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          deviceBrandArb,
          connectionTypeArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (userId, brand, connectionType, deviceName) => {
            const device = await service.registerDevice(userId, {
              name: deviceName,
              brand,
              model: 'test-model',
              connectionType,
            });

            expect(device).toBeDefined();
            expect(device.id).toBeTruthy();
            expect(device.userId).toBe(userId);
            expect(device.brand).toBe(brand);
            expect(device.connectionType).toBe(connectionType);
            expect(device.compartments.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should initialize correct compartment count per brand', async () => {
      const brandCompartments: Record<string, number> = {
        hero: 10,
        medminder: 28,
        philips: 6,
      };

      for (const [brand, expectedCount] of Object.entries(brandCompartments)) {
        const device = await service.registerDevice('user1', {
          name: 'Test Device',
          brand,
          model: 'test',
          connectionType: 'wifi',
        });

        expect(device.compartments.length).toBe(expectedCount);
      }
    });
  });

  describe('14.2: Auto-logging from dispenser events', () => {
    it('should record dispense events and update compartment state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          async (compartmentId, pillsDispensed) => {
            const device = await service.registerDevice('user1', {
              name: 'Test',
              brand: 'hero',
              model: 'test',
              connectionType: 'wifi',
            });

            // Set initial pill count
            const compartment = device.compartments.find(c => c.id === compartmentId);
            if (!compartment) return;
            
            compartment.pillCount = 30;
            compartment.medicationId = 'med1';

            const event = await service.recordDispenseEvent(
              device.id,
              compartmentId,
              pillsDispensed
            );

            expect(event).toBeDefined();
            expect(event!.type).toBe('dispense');
            expect(event!.compartmentId).toBe(compartmentId);
            expect(event!.details?.pillsDispensed).toBe(pillsDispensed);
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should trigger event handlers on dispense for auto-logging', async () => {
      const device = await service.registerDevice('user1', {
        name: 'Test',
        brand: 'hero',
        model: 'test',
        connectionType: 'wifi',
      });

      device.compartments[0].pillCount = 20;
      device.compartments[0].medicationId = 'med1';

      const receivedEvents: any[] = [];
      service.registerEventHandler('test', (event) => {
        receivedEvents.push(event);
      });

      await service.recordDispenseEvent(device.id, 1, 1);

      expect(receivedEvents.length).toBeGreaterThan(0);
      expect(receivedEvents[0].type).toBe('dispense');
    });
  });

  describe('14.3: Supply level tracking', () => {
    it('should track and update supply levels correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 30 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (initialPills, dispenseCount, refillCount) => {
            const device = await service.registerDevice('user1', {
              name: 'Test',
              brand: 'hero',
              model: 'test',
              connectionType: 'wifi',
            });

            const compartment = device.compartments[0];
            compartment.pillCount = initialPills;

            // Dispense pills
            for (let i = 0; i < dispenseCount; i++) {
              await service.recordDispenseEvent(device.id, 1, 1);
            }

            const afterDispense = device.compartments[0].pillCount;
            expect(afterDispense).toBe(Math.max(0, initialPills - dispenseCount));

            // Refill
            await service.recordRefillEvent(device.id, 1, refillCount * 10);

            const afterRefill = device.compartments[0].pillCount;
            expect(afterRefill).toBe(Math.min(30, afterDispense + refillCount * 10));
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should generate low supply events when threshold reached', async () => {
      const device = await service.registerDevice('user1', {
        name: 'Test',
        brand: 'hero',
        model: 'test',
        connectionType: 'wifi',
      });

      device.compartments[0].pillCount = 6;
      device.compartments[0].medicationId = 'med1';

      const receivedEvents: any[] = [];
      service.registerEventHandler('test', (event) => {
        receivedEvents.push(event);
      });

      // Dispense to trigger low supply (<=5)
      await service.recordDispenseEvent(device.id, 1, 2);

      const lowSupplyEvent = receivedEvents.find(e => e.type === 'low_supply');
      expect(lowSupplyEvent).toBeDefined();
    });
  });

  describe('14.4: Fallback on malfunction', () => {
    it('should detect device health issues', async () => {
      const device = await service.registerDevice('user1', {
        name: 'Test',
        brand: 'hero',
        model: 'test',
        connectionType: 'wifi',
      });

      // Device starts disconnected
      const health = await service.checkDeviceHealth(device.id);
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Device is not connected');
    });

    it('should report healthy when device is connected and responsive', async () => {
      const device = await service.registerDevice('user1', {
        name: 'Test',
        brand: 'hero',
        model: 'test',
        connectionType: 'wifi',
      });

      await service.connectDevice(device.id);

      const health = await service.checkDeviceHealth(device.id);
      expect(health.healthy).toBe(true);
      expect(health.issues.length).toBe(0);
    });

    it('should detect low battery as health issue', async () => {
      const device = await service.registerDevice('user1', {
        name: 'Test',
        brand: 'hero',
        model: 'test',
        connectionType: 'wifi',
      });

      await service.connectDevice(device.id);
      device.batteryLevel = 15;

      const health = await service.checkDeviceHealth(device.id);
      expect(health.issues.some(i => i.includes('battery'))).toBe(true);
    });
  });

  describe('14.5: Device pairing and management', () => {
    it('should support device connection lifecycle', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const device = await service.registerDevice(userId, {
            name: 'Test',
            brand: 'hero',
            model: 'test',
            connectionType: 'bluetooth',
          });

          expect(device.status).toBe('disconnected');

          const connected = await service.connectDevice(device.id);
          expect(connected).toBe(true);

          const devices = await service.getUserDevices(userId);
          expect(devices.find(d => d.id === device.id)?.status).toBe('connected');

          const disconnected = await service.disconnectDevice(device.id);
          expect(disconnected).toBe(true);
        }),
        { numRuns: 10 }
      );
    });

    it('should allow medication assignment to compartments', async () => {
      const device = await service.registerDevice('user1', {
        name: 'Test',
        brand: 'hero',
        model: 'test',
        connectionType: 'wifi',
      });

      const assigned = await service.assignMedication(
        device.id,
        1,
        'med123',
        'Lisinopril 10mg'
      );

      expect(assigned).toBe(true);
      expect(device.compartments[0].medicationId).toBe('med123');
      expect(device.compartments[0].medicationName).toBe('Lisinopril 10mg');
    });

    it('should track multiple devices per user', async () => {
      const userId = 'user1';

      await service.registerDevice(userId, {
        name: 'Kitchen Dispenser',
        brand: 'hero',
        model: 'h1',
        connectionType: 'wifi',
      });

      await service.registerDevice(userId, {
        name: 'Bedroom Dispenser',
        brand: 'philips',
        model: 'p1',
        connectionType: 'bluetooth',
      });

      const devices = await service.getUserDevices(userId);
      expect(devices.length).toBe(2);
    });

    it('should allow device removal', async () => {
      const device = await service.registerDevice('user1', {
        name: 'Test',
        brand: 'hero',
        model: 'test',
        connectionType: 'wifi',
      });

      const removed = await service.removeDevice(device.id);
      expect(removed).toBe(true);

      const devices = await service.getUserDevices('user1');
      expect(devices.find(d => d.id === device.id)).toBeUndefined();
    });
  });
});
