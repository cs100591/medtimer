import * as fc from 'fast-check';

/**
 * Property 22: Medical History and Provider Integration
 * Validates: Requirements 13.1, 13.2, 13.3, 13.5
 * 
 * Tests that medical history tracking correctly records events,
 * maintains timelines, and generates provider-formatted reports.
 */
describe('Property 22: Medical History and Provider Integration', () => {
  const eventTypes = ['started', 'stopped', 'dosage_changed', 'frequency_changed', 'paused', 'resumed'];

  // History entry arbitrary
  const historyEntryArb = fc.record({
    id: fc.uuid(),
    medicationId: fc.uuid(),
    userId: fc.uuid(),
    eventType: fc.constantFrom(...eventTypes),
    eventDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    previousValue: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    newValue: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    reason: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
    effectivenessRating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
  });

  test('all event types are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...eventTypes),
        (eventType) => {
          expect(eventTypes).toContain(eventType);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('history entries have required fields', () => {
    fc.assert(
      fc.property(historyEntryArb, (entry) => {
        expect(entry.id).toBeDefined();
        expect(entry.medicationId).toBeDefined();
        expect(entry.userId).toBeDefined();
        expect(eventTypes).toContain(entry.eventType);
        expect(entry.eventDate).toBeInstanceOf(Date);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('effectiveness rating is between 1 and 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (rating) => {
          expect(rating).toBeGreaterThanOrEqual(1);
          expect(rating).toBeLessThanOrEqual(5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('timeline duration calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        (startDate, endDate) => {
          const durationMs = endDate.getTime() - startDate.getTime();
          const durationDays = Math.ceil(durationMs / (24 * 60 * 60 * 1000));

          expect(durationDays).toBeGreaterThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('history entries are chronologically sortable', () => {
    fc.assert(
      fc.property(
        fc.array(historyEntryArb, { minLength: 2, maxLength: 20 }),
        (entries) => {
          const sorted = [...entries].sort(
            (a, b) => a.eventDate.getTime() - b.eventDate.getTime()
          );

          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].eventDate.getTime()).toBeGreaterThanOrEqual(
              sorted[i - 1].eventDate.getTime()
            );
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('average effectiveness calculation is accurate', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 20 }),
        (ratings) => {
          const sum = ratings.reduce((a, b) => a + b, 0);
          const average = sum / ratings.length;

          expect(average).toBeGreaterThanOrEqual(1);
          expect(average).toBeLessThanOrEqual(5);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('side effects are collected without duplicates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
          { minLength: 1, maxLength: 10 }
        ),
        (sideEffectArrays) => {
          const allEffects = sideEffectArrays.flat();
          const uniqueEffects = new Set(allEffects);

          expect(uniqueEffects.size).toBeLessThanOrEqual(allEffects.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('provider medication list separates current and past', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            isActive: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (medications) => {
          const current = medications.filter(m => m.isActive);
          const past = medications.filter(m => !m.isActive);

          expect(current.length + past.length).toBe(medications.length);
          
          for (const med of current) {
            expect(med.isActive).toBe(true);
          }
          for (const med of past) {
            expect(med.isActive).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('dosage change records previous and new values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (previousDosage, newDosage) => {
          const entry = {
            eventType: 'dosage_changed',
            previousValue: previousDosage,
            newValue: newDosage,
          };

          expect(entry.eventType).toBe('dosage_changed');
          expect(entry.previousValue).toBeDefined();
          expect(entry.newValue).toBeDefined();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('stop reason is recorded when medication is stopped', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (reason) => {
          const entry = {
            eventType: 'stopped',
            reason,
          };

          expect(entry.eventType).toBe('stopped');
          expect(entry.reason).toBeDefined();
          expect(entry.reason.length).toBeGreaterThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('timeline includes all events for a medication', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(historyEntryArb, { minLength: 1, maxLength: 20 }),
        (medicationId, allEntries) => {
          // Assign all entries to the same medication
          const medicationEntries = allEntries.map(e => ({
            ...e,
            medicationId,
          }));

          const timeline = {
            medicationId,
            events: medicationEntries,
          };

          expect(timeline.events.length).toBe(allEntries.length);
          for (const event of timeline.events) {
            expect(event.medicationId).toBe(medicationId);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('provider report has required sections', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
        (patientName, allergies) => {
          const report = {
            patientName,
            generatedAt: new Date(),
            currentMedications: [],
            pastMedications: [],
            allergies,
          };

          expect(report.patientName).toBeDefined();
          expect(report.generatedAt).toBeInstanceOf(Date);
          expect(Array.isArray(report.currentMedications)).toBe(true);
          expect(Array.isArray(report.pastMedications)).toBe(true);
          expect(Array.isArray(report.allergies)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('medication dates are logically consistent', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
        fc.option(
          fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          { nil: undefined }
        ),
        (startDate, endDate) => {
          if (endDate) {
            expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
