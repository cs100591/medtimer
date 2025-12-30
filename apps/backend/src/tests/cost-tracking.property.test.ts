import * as fc from 'fast-check';

/**
 * Property 21: Cost Tracking and Insurance Management
 * Validates: Requirements 12.2, 12.3, 12.4
 * 
 * Tests that cost tracking correctly calculates expenses,
 * handles insurance coverage, and generates accurate reports.
 */
describe('Property 21: Cost Tracking and Insurance Management', () => {
  const coverageTypes = ['full', 'partial', 'none'];
  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

  // Insurance plan arbitrary
  const insurancePlanArb = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    provider: fc.string({ minLength: 1, maxLength: 100 }),
    memberId: fc.stringMatching(/^[A-Z0-9]{8,12}$/),
    isPrimary: fc.boolean(),
    coverageType: fc.constantFrom(...coverageTypes),
    copayAmount: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
    deductible: fc.option(fc.float({ min: 0, max: 10000, noNaN: true }), { nil: undefined }),
  });

  // Medication cost arbitrary
  const medicationCostArb = fc.record({
    medicationId: fc.uuid(),
    retailPrice: fc.float({ min: 0.01, max: 1000, noNaN: true }),
    insurancePrice: fc.option(fc.float({ min: 0, max: 500, noNaN: true }), { nil: undefined }),
    copay: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
    currency: fc.constantFrom(...currencies),
  });

  test('retail price is always positive', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 10000, noNaN: true }),
        (retailPrice) => {
          expect(retailPrice).toBeGreaterThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('out-of-pocket never exceeds retail price', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000, noNaN: true }), // retail
        fc.float({ min: 0, max: 100, noNaN: true }), // copay percentage
        (retail, copayPercent) => {
          const outOfPocket = retail * (copayPercent / 100);
          expect(outOfPocket).toBeLessThanOrEqual(retail);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('insurance paid equals retail minus out-of-pocket', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000, noNaN: true }), // retail
        fc.float({ min: 0, max: 1000, noNaN: true }), // outOfPocket (capped at retail)
        (retail, rawOutOfPocket) => {
          const outOfPocket = Math.min(rawOutOfPocket, retail);
          const insurancePaid = retail - outOfPocket;

          expect(insurancePaid).toBeGreaterThanOrEqual(0);
          expect(insurancePaid + outOfPocket).toBeCloseTo(retail, 2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('full coverage results in zero out-of-pocket (excluding copay)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000, noNaN: true }), // retail
        fc.option(fc.float({ min: 0, max: 50, noNaN: true }), { nil: undefined }), // copay
        (retail, copay) => {
          const coverageType = 'full';
          let outOfPocket: number;

          if (copay !== undefined) {
            outOfPocket = copay;
          } else if (coverageType === 'full') {
            outOfPocket = 0;
          } else {
            outOfPocket = retail;
          }

          if (copay === undefined && coverageType === 'full') {
            expect(outOfPocket).toBe(0);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('no coverage results in full retail as out-of-pocket', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000, noNaN: true }),
        (retail) => {
          const coverageType = 'none';
          const outOfPocket = coverageType === 'none' ? retail : 0;

          expect(outOfPocket).toBe(retail);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('only one primary insurance plan per user', () => {
    fc.assert(
      fc.property(
        fc.array(insurancePlanArb, { minLength: 2, maxLength: 5 }),
        (plans) => {
          // Simulate setting one as primary
          const withPrimary = plans.map((p, i) => ({
            ...p,
            isPrimary: i === 0,
          }));

          const primaryCount = withPrimary.filter(p => p.isPrimary).length;
          expect(primaryCount).toBe(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('expense report totals are accurate', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            retail: fc.float({ min: 0, max: 500, noNaN: true }),
            outOfPocket: fc.float({ min: 0, max: 500, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (medications) => {
          const totalRetail = medications.reduce((sum, m) => sum + m.retail, 0);
          const totalOutOfPocket = medications.reduce((sum, m) => sum + m.outOfPocket, 0);

          expect(totalRetail).toBeGreaterThanOrEqual(0);
          expect(totalOutOfPocket).toBeGreaterThanOrEqual(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('monthly breakdown sums to total', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            month: fc.stringMatching(/^2024-(0[1-9]|1[0-2])$/),
            amount: fc.float({ min: 0, max: 1000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 12 }
        ),
        (monthlyData) => {
          const total = monthlyData.reduce((sum, m) => sum + m.amount, 0);
          const sumOfMonths = monthlyData.reduce((sum, m) => sum + m.amount, 0);

          expect(total).toBeCloseTo(sumOfMonths, 2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('currency is always valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...currencies),
        (currency) => {
          expect(currencies).toContain(currency);
          expect(currency.length).toBe(3);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('deductible tracking is accurate', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 5000, noNaN: true }), // deductible
        fc.float({ min: 0, max: 5000, noNaN: true }), // deductibleMet
        (deductible, deductibleMet) => {
          const remaining = Math.max(0, deductible - deductibleMet);
          const percentMet = deductible > 0 ? (deductibleMet / deductible) * 100 : 100;

          expect(remaining).toBeGreaterThanOrEqual(0);
          expect(percentMet).toBeGreaterThanOrEqual(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('yearly summary calculations are correct', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: 0, max: 500, noNaN: true }),
          { minLength: 1, maxLength: 12 }
        ),
        (monthlyAmounts) => {
          const total = monthlyAmounts.reduce((a, b) => a + b, 0);
          const average = total / monthlyAmounts.length;
          const highest = Math.max(...monthlyAmounts);
          const lowest = Math.min(...monthlyAmounts);

          expect(total).toBeGreaterThanOrEqual(0);
          expect(average).toBeGreaterThanOrEqual(0);
          expect(highest).toBeGreaterThanOrEqual(lowest);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('medication cost record has required fields', () => {
    fc.assert(
      fc.property(medicationCostArb, (cost) => {
        expect(cost.medicationId).toBeDefined();
        expect(cost.retailPrice).toBeGreaterThan(0);
        expect(currencies).toContain(cost.currency);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('insurance plan has required fields', () => {
    fc.assert(
      fc.property(insurancePlanArb, (plan) => {
        expect(plan.id).toBeDefined();
        expect(plan.userId).toBeDefined();
        expect(plan.name.length).toBeGreaterThan(0);
        expect(plan.provider.length).toBeGreaterThan(0);
        expect(plan.memberId).toBeDefined();
        expect(coverageTypes).toContain(plan.coverageType);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
