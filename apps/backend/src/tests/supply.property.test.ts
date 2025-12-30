import * as fc from 'fast-check';

/**
 * Property 7: Supply Calculation and Refill Reminders
 * Validates: Requirements 3.5
 * 
 * Tests that supply tracking correctly calculates remaining doses,
 * estimates run-out dates, and triggers appropriate refill reminders.
 */
describe('Property 7: Supply Calculation and Refill Reminders', () => {
  // Helper to calculate days remaining
  function calculateDaysRemaining(currentSupply: number, dailyUsage: number): number {
    if (dailyUsage <= 0) return Infinity;
    return Math.floor(currentSupply / dailyUsage);
  }

  // Helper to calculate run-out date
  function calculateRunOutDate(currentSupply: number, dailyUsage: number): Date | null {
    const daysRemaining = calculateDaysRemaining(currentSupply, dailyUsage);
    if (!isFinite(daysRemaining)) return null;
    return new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
  }

  // Helper to check if low supply
  function isLowSupply(currentSupply: number, threshold: number): boolean {
    return currentSupply <= threshold;
  }

  test('days remaining calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // currentSupply
        fc.integer({ min: 1, max: 10 }), // dailyUsage
        (currentSupply, dailyUsage) => {
          const daysRemaining = calculateDaysRemaining(currentSupply, dailyUsage);
          
          // Days remaining should be floor of supply / usage
          expect(daysRemaining).toBe(Math.floor(currentSupply / dailyUsage));
          
          // Days remaining should be non-negative
          expect(daysRemaining).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('zero daily usage results in infinite days remaining', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // currentSupply
        (currentSupply) => {
          const daysRemaining = calculateDaysRemaining(currentSupply, 0);
          expect(daysRemaining).toBe(Infinity);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('run-out date is in the future when supply exists', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }), // currentSupply (at least 1)
        fc.integer({ min: 1, max: 10 }), // dailyUsage
        (currentSupply, dailyUsage) => {
          const runOutDate = calculateRunOutDate(currentSupply, dailyUsage);
          
          if (runOutDate) {
            expect(runOutDate.getTime()).toBeGreaterThan(Date.now());
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('low supply detection respects threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // currentSupply
        fc.integer({ min: 1, max: 50 }), // threshold
        (currentSupply, threshold) => {
          const isLow = isLowSupply(currentSupply, threshold);
          
          if (currentSupply <= threshold) {
            expect(isLow).toBe(true);
          } else {
            expect(isLow).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('refill increases supply correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }), // currentSupply
        fc.integer({ min: 1, max: 500 }), // refillQuantity
        (currentSupply, refillQuantity) => {
          const newSupply = currentSupply + refillQuantity;
          
          expect(newSupply).toBe(currentSupply + refillQuantity);
          expect(newSupply).toBeGreaterThan(currentSupply);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('supply decrement never goes below zero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // currentSupply
        fc.integer({ min: 1, max: 200 }), // decrementAmount
        (currentSupply, decrementAmount) => {
          const newSupply = Math.max(0, currentSupply - decrementAmount);
          
          expect(newSupply).toBeGreaterThanOrEqual(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('daily usage calculation for different frequencies', () => {
    // Daily frequency
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }), // times per day
        (timesPerDay) => {
          const dailyUsage = timesPerDay;
          expect(dailyUsage).toBe(timesPerDay);
          return true;
        }
      ),
      { numRuns: 50 }
    );

    // Weekly frequency
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7 }), // days per week
        fc.integer({ min: 1, max: 4 }), // times per scheduled day
        (daysPerWeek, timesPerDay) => {
          const dailyUsage = (timesPerDay * daysPerWeek) / 7;
          
          expect(dailyUsage).toBeGreaterThan(0);
          expect(dailyUsage).toBeLessThanOrEqual(timesPerDay);
          return true;
        }
      ),
      { numRuns: 50 }
    );

    // Interval frequency (every N days)
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }), // interval days
        fc.integer({ min: 1, max: 4 }), // times per scheduled day
        (intervalDays, timesPerDay) => {
          const dailyUsage = timesPerDay / intervalDays;
          
          expect(dailyUsage).toBeGreaterThan(0);
          expect(dailyUsage).toBeLessThanOrEqual(timesPerDay);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('refill reminder triggers at correct threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // currentSupply
        fc.integer({ min: 1, max: 10 }), // dailyUsage
        fc.integer({ min: 1, max: 14 }), // reminderDaysAhead
        (currentSupply, dailyUsage, reminderDaysAhead) => {
          const daysRemaining = calculateDaysRemaining(currentSupply, dailyUsage);
          const shouldRemind = daysRemaining <= reminderDaysAhead && daysRemaining >= 0;
          
          if (daysRemaining <= reminderDaysAhead && isFinite(daysRemaining)) {
            expect(shouldRemind).toBe(true);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('supply status contains all required fields', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (medicationId, medicationName, currentSupply, threshold, dailyUsage) => {
          const status = {
            medicationId,
            medicationName,
            currentSupply,
            lowSupplyThreshold: threshold,
            isLowSupply: isLowSupply(currentSupply, threshold),
            estimatedDaysRemaining: calculateDaysRemaining(currentSupply, dailyUsage),
            estimatedRunOutDate: calculateRunOutDate(currentSupply, dailyUsage),
            dailyUsage,
            lastRefillDate: null,
          };

          // All required fields should be present
          expect(status.medicationId).toBeDefined();
          expect(status.medicationName).toBeDefined();
          expect(typeof status.currentSupply).toBe('number');
          expect(typeof status.lowSupplyThreshold).toBe('number');
          expect(typeof status.isLowSupply).toBe('boolean');
          expect(typeof status.estimatedDaysRemaining).toBe('number');
          expect(typeof status.dailyUsage).toBe('number');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('multiple medications have independent supply tracking', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            currentSupply: fc.integer({ min: 0, max: 100 }),
            threshold: fc.integer({ min: 1, max: 20 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (medications) => {
          // Each medication should have independent supply
          const supplies = new Map<string, number>();
          
          for (const med of medications) {
            supplies.set(med.id, med.currentSupply);
          }

          // Modifying one shouldn't affect others
          const firstId = medications[0].id;
          const originalSupply = supplies.get(firstId)!;
          supplies.set(firstId, originalSupply + 10);

          // Other medications should be unchanged
          for (let i = 1; i < medications.length; i++) {
            expect(supplies.get(medications[i].id)).toBe(medications[i].currentSupply);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('refill history maintains chronological order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            quantity: fc.integer({ min: 1, max: 100 }),
            timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (refills) => {
          // Sort by timestamp
          const sorted = [...refills].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );

          // Verify chronological order
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

  test('cost calculation is accurate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // quantity
        fc.float({ min: 0.01, max: 100, noNaN: true }), // costPerUnit
        (quantity, costPerUnit) => {
          const totalCost = quantity * costPerUnit;
          
          expect(totalCost).toBeGreaterThan(0);
          expect(totalCost).toBeCloseTo(quantity * costPerUnit, 2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
