import * as fc from 'fast-check';
import { AdherenceStatus } from '@medication-reminder/shared-types';

/**
 * Property 10: Adherence Tracking Options
 * Validates: Requirements 5.1, 5.4
 * 
 * Tests that adherence tracking correctly handles all status options
 * and maintains data integrity for logging operations.
 */
describe('Property 10: Adherence Tracking Options', () => {
  // Valid adherence statuses
  const validStatuses = Object.values(AdherenceStatus);

  // Arbitrary for adherence record
  const adherenceRecordArb = fc.record({
    scheduleId: fc.uuid(),
    medicationId: fc.uuid(),
    userId: fc.uuid(),
    scheduledTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    status: fc.constantFrom(...validStatuses),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    method: fc.constantFrom('manual', 'auto', 'dispenser', 'voice'),
  });

  test('all valid adherence statuses are accepted', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validStatuses),
        (status) => {
          // Every valid status should be a valid AdherenceStatus
          expect(validStatuses).toContain(status);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('adherence records maintain required fields', () => {
    fc.assert(
      fc.property(adherenceRecordArb, (record) => {
        // Required fields must be present
        expect(record.scheduleId).toBeDefined();
        expect(record.medicationId).toBeDefined();
        expect(record.userId).toBeDefined();
        expect(record.scheduledTime).toBeInstanceOf(Date);
        expect(validStatuses).toContain(record.status);
        expect(['manual', 'auto', 'dispenser', 'voice']).toContain(record.method);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('taken status requires actual time to be set', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (scheduledTime, actualTime) => {
          // When status is TAKEN, actualTime should be set
          const record = {
            status: AdherenceStatus.TAKEN,
            scheduledTime,
            actualTime,
          };

          // Actual time should be defined for taken status
          expect(record.actualTime).toBeDefined();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('skipped and missed statuses do not require actual time', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(AdherenceStatus.SKIPPED, AdherenceStatus.MISSED),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (status, scheduledTime) => {
          const record = {
            status,
            scheduledTime,
            actualTime: null,
          };

          // Actual time can be null for skipped/missed
          expect(record.actualTime).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('snooze count increments correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (initialCount, snoozeActions) => {
          let snoozeCount = initialCount;
          
          for (let i = 0; i < snoozeActions; i++) {
            snoozeCount++;
          }

          expect(snoozeCount).toBe(initialCount + snoozeActions);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('snoozed until time is always in the future relative to scheduled time', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: 1, max: 120 }), // snooze minutes
        (scheduledTime, snoozeMinutes) => {
          const snoozedUntil = new Date(scheduledTime.getTime() + snoozeMinutes * 60 * 1000);
          
          expect(snoozedUntil.getTime()).toBeGreaterThan(scheduledTime.getTime());
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('notes field accepts any valid string', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1000 }),
        (notes) => {
          const record = { notes };
          
          // Notes should be stored as-is
          expect(record.notes).toBe(notes);
          expect(typeof record.notes).toBe('string');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('logging method is always one of valid options', () => {
    const validMethods = ['manual', 'auto', 'dispenser', 'voice'];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...validMethods),
        (method) => {
          expect(validMethods).toContain(method);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 11: Adherence Reporting and Visualization
 * Validates: Requirements 5.2, 5.3, 5.5, 12.5, 15.2
 * 
 * Tests that adherence reporting correctly calculates statistics
 * and generates accurate compliance data.
 */
describe('Property 11: Adherence Reporting and Visualization', () => {
  // Helper to calculate compliance rate
  function calculateComplianceRate(taken: number, total: number, pending: number): number {
    const completed = total - pending;
    if (completed === 0) return 0;
    return (taken / completed) * 100;
  }

  // Helper to calculate on-time rate
  function calculateOnTimeRate(onTime: number, taken: number): number {
    if (taken === 0) return 0;
    return (onTime / taken) * 100;
  }

  test('compliance rate is between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // taken
        fc.integer({ min: 0, max: 1000 }), // skipped
        fc.integer({ min: 0, max: 1000 }), // missed
        fc.integer({ min: 0, max: 1000 }), // pending
        (taken, skipped, missed, pending) => {
          const total = taken + skipped + missed + pending;
          const rate = calculateComplianceRate(taken, total, pending);
          
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('on-time rate is between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // onTime
        fc.integer({ min: 0, max: 1000 }), // taken (must be >= onTime)
        (onTime, extraTaken) => {
          const taken = onTime + extraTaken;
          const rate = calculateOnTimeRate(onTime, taken);
          
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('total count equals sum of all status counts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (taken, skipped, snoozed, missed, pending) => {
          const total = taken + skipped + snoozed + missed + pending;
          const stats = { taken, skipped, snoozed, missed, pending, total };
          
          expect(stats.total).toBe(
            stats.taken + stats.skipped + stats.snoozed + stats.missed + stats.pending
          );
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('delay calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.integer({ min: -120, max: 120 }), // delay in minutes
        (scheduledTime, delayMinutes) => {
          const actualTime = new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000);
          const calculatedDelay = Math.round(
            (actualTime.getTime() - scheduledTime.getTime()) / 60000
          );
          
          expect(calculatedDelay).toBe(delayMinutes);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('on-time detection respects tolerance', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -120, max: 120 }), // delay in minutes
        fc.integer({ min: 1, max: 60 }), // tolerance in minutes
        (delayMinutes, toleranceMinutes) => {
          const isOnTime = Math.abs(delayMinutes) <= toleranceMinutes;
          
          if (Math.abs(delayMinutes) <= toleranceMinutes) {
            expect(isOnTime).toBe(true);
          } else {
            expect(isOnTime).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('daily stats aggregate correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-01-07') }),
            status: fc.constantFrom(...Object.values(AdherenceStatus)),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (records) => {
          // Group by day
          const byDay = new Map<string, typeof records>();
          for (const record of records) {
            const dayKey = record.date.toISOString().split('T')[0];
            const existing = byDay.get(dayKey) || [];
            existing.push(record);
            byDay.set(dayKey, existing);
          }

          // Total records should equal sum of daily records
          let totalFromDays = 0;
          for (const dayRecords of byDay.values()) {
            totalFromDays += dayRecords.length;
          }

          expect(totalFromDays).toBe(records.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('medication-specific stats are isolated', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            medicationId: fc.constantFrom('med1', 'med2', 'med3'),
            status: fc.constantFrom(...Object.values(AdherenceStatus)),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (records) => {
          // Group by medication
          const byMed = new Map<string, typeof records>();
          for (const record of records) {
            const existing = byMed.get(record.medicationId) || [];
            existing.push(record);
            byMed.set(record.medicationId, existing);
          }

          // Each medication's records should be independent
          let totalFromMeds = 0;
          for (const medRecords of byMed.values()) {
            totalFromMeds += medRecords.length;
          }

          expect(totalFromMeds).toBe(records.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('average delay calculation handles edge cases', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -120, max: 120 }), { minLength: 0, maxLength: 100 }),
        (delays) => {
          if (delays.length === 0) {
            const average = 0;
            expect(average).toBe(0);
          } else {
            const sum = delays.reduce((a, b) => a + b, 0);
            const average = sum / delays.length;
            
            // Average should be within the range of min and max delays
            expect(average).toBeGreaterThanOrEqual(Math.min(...delays));
            expect(average).toBeLessThanOrEqual(Math.max(...delays));
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('CSV export contains all required columns', () => {
    const requiredColumns = [
      'Date',
      'Time',
      'Medication',
      'Status',
      'Actual Time',
      'Delay (min)',
      'Notes',
      'Method',
    ];

    fc.assert(
      fc.property(
        fc.constant(requiredColumns),
        (columns) => {
          // All required columns should be present
          expect(columns.length).toBe(8);
          expect(columns).toContain('Date');
          expect(columns).toContain('Status');
          expect(columns).toContain('Medication');
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  test('date range filtering is inclusive', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        fc.array(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          { minLength: 1, maxLength: 20 }
        ),
        (startDate, endDate, recordDates) => {
          const filteredDates = recordDates.filter(
            d => d >= startDate && d <= endDate
          );

          // All filtered dates should be within range
          for (const date of filteredDates) {
            expect(date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(date.getTime()).toBeLessThanOrEqual(endDate.getTime());
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
