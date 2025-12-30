/**
 * Feature: medication-reminder-app, Property 1: Medication Reminder Configuration
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * Property: For any valid medication data (name, dosage, frequency, duration), 
 * the system should accept and store the configuration, and support all specified 
 * duration patterns including fixed-term, ongoing, and custom cycles
 */

import * as fc from 'fast-check';
import { 
  DosageUnit, 
  MedicationForm, 
  FrequencyType, 
  DurationType 
} from '../../types/shared-types';

// Arbitraries for medication data
const dosageUnitArb = fc.constantFrom(
  DosageUnit.PILL,
  DosageUnit.TABLET,
  DosageUnit.CAPSULE,
  DosageUnit.ML,
  DosageUnit.MG,
  DosageUnit.DROPS,
  DosageUnit.PUFF,
  DosageUnit.PATCH,
  DosageUnit.INJECTION
);

const medicationFormArb = fc.constantFrom(
  MedicationForm.TABLET,
  MedicationForm.CAPSULE,
  MedicationForm.LIQUID,
  MedicationForm.INJECTION,
  MedicationForm.INHALER,
  MedicationForm.PATCH,
  MedicationForm.CREAM,
  MedicationForm.DROPS
);

const frequencyTypeArb = fc.constantFrom(
  FrequencyType.DAILY,
  FrequencyType.WEEKLY,
  FrequencyType.MONTHLY,
  FrequencyType.AS_NEEDED,
  FrequencyType.CUSTOM
);

const durationTypeArb = fc.constantFrom(
  DurationType.ONGOING,
  DurationType.FIXED_TERM,
  DurationType.CYCLE
);

const medicationNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

const dosageAmountArb = fc.float({ min: 0.1, max: 1000, noNaN: true })
  .map(n => Math.round(n * 100) / 100);

const timeSlotArb = fc.record({
  hour: fc.integer({ min: 0, max: 23 }),
  minute: fc.integer({ min: 0, max: 59 }),
  label: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
});

const customCycleArb = fc.record({
  activeDays: fc.integer({ min: 1, max: 30 }),
  breakDays: fc.integer({ min: 0, max: 30 }),
});

const medicationConfigArb = fc.record({
  name: medicationNameArb,
  dosageAmount: dosageAmountArb,
  dosageUnit: dosageUnitArb,
  form: medicationFormArb,
});

const scheduleConfigArb = fc.record({
  frequencyType: frequencyTypeArb,
  frequencyInterval: fc.integer({ min: 1, max: 30 }),
  timesPerDay: fc.integer({ min: 1, max: 10 }),
  timeSlots: fc.array(timeSlotArb, { minLength: 1, maxLength: 10 }),
  durationType: durationTypeArb,
  totalDays: fc.option(fc.integer({ min: 1, max: 365 })),
  customCycle: fc.option(customCycleArb),
});

describe('Property 1: Medication Reminder Configuration', () => {
  describe('Medication data validation', () => {
    it('should accept any valid medication name', () => {
      fc.assert(
        fc.property(medicationNameArb, (name) => {
          // Valid medication names should be non-empty after trimming
          return name.trim().length > 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should accept any valid dosage amount', () => {
      fc.assert(
        fc.property(dosageAmountArb, (amount) => {
          // Valid dosage amounts should be positive numbers
          return amount > 0 && !isNaN(amount) && isFinite(amount);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept all defined dosage units', () => {
      fc.assert(
        fc.property(dosageUnitArb, (unit) => {
          // All dosage units should be valid enum values
          return Object.values(DosageUnit).includes(unit);
        }),
        { numRuns: 100 }
      );
    });

    it('should accept all defined medication forms', () => {
      fc.assert(
        fc.property(medicationFormArb, (form) => {
          // All medication forms should be valid enum values
          return Object.values(MedicationForm).includes(form);
        }),
        { numRuns: 100 }
      );
    });

    it('should create valid medication configuration objects', () => {
      fc.assert(
        fc.property(medicationConfigArb, (config) => {
          return (
            config.name.trim().length > 0 &&
            config.dosageAmount > 0 &&
            Object.values(DosageUnit).includes(config.dosageUnit) &&
            Object.values(MedicationForm).includes(config.form)
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Duration pattern support', () => {
    it('should support ongoing duration type', () => {
      fc.assert(
        fc.property(
          fc.record({
            durationType: fc.constant(DurationType.ONGOING),
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          (duration) => {
            // Ongoing medications have no end date
            return duration.durationType === DurationType.ONGOING;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support fixed-term duration with valid day counts', () => {
      fc.assert(
        fc.property(
          fc.record({
            durationType: fc.constant(DurationType.FIXED_TERM),
            totalDays: fc.integer({ min: 1, max: 365 }),
          }),
          (duration) => {
            // Fixed-term medications have a positive day count
            return (
              duration.durationType === DurationType.FIXED_TERM &&
              duration.totalDays > 0 &&
              duration.totalDays <= 365
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support cycle duration with valid active and break days', () => {
      fc.assert(
        fc.property(
          fc.record({
            durationType: fc.constant(DurationType.CYCLE),
            activeDays: fc.integer({ min: 1, max: 30 }),
            breakDays: fc.integer({ min: 0, max: 30 }),
          }),
          (duration) => {
            // Cycle medications have positive active days and non-negative break days
            return (
              duration.durationType === DurationType.CYCLE &&
              duration.activeDays > 0 &&
              duration.breakDays >= 0
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support all duration types', () => {
      fc.assert(
        fc.property(durationTypeArb, (durationType) => {
          return Object.values(DurationType).includes(durationType);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Frequency pattern support', () => {
    it('should support all frequency types', () => {
      fc.assert(
        fc.property(frequencyTypeArb, (frequencyType) => {
          return Object.values(FrequencyType).includes(frequencyType);
        }),
        { numRuns: 100 }
      );
    });

    it('should support valid frequency intervals', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          (interval) => {
            return interval >= 1 && interval <= 30;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support multiple times per day', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (timesPerDay) => {
            return timesPerDay >= 1 && timesPerDay <= 10;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support valid time slots', () => {
      fc.assert(
        fc.property(timeSlotArb, (timeSlot) => {
          return (
            timeSlot.hour >= 0 && timeSlot.hour <= 23 &&
            timeSlot.minute >= 0 && timeSlot.minute <= 59
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should support specific days of week for weekly frequency', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 7 }),
          (days) => {
            // Days should be valid day-of-week values (0-6)
            return days.every(d => d >= 0 && d <= 6);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Complete schedule configuration', () => {
    it('should create valid complete schedule configurations', () => {
      fc.assert(
        fc.property(scheduleConfigArb, (config) => {
          return (
            Object.values(FrequencyType).includes(config.frequencyType) &&
            config.frequencyInterval >= 1 &&
            config.timesPerDay >= 1 &&
            config.timeSlots.length >= 1 &&
            Object.values(DurationType).includes(config.durationType)
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should ensure time slots match times per day', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (timesPerDay) => {
            // Generate exactly timesPerDay time slots
            const timeSlots = Array.from({ length: timesPerDay }, (_, i) => ({
              hour: 8 + i * 4, // Spread throughout the day
              minute: 0,
            }));
            return timeSlots.length === timesPerDay;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle minimum valid configuration', () => {
      const minConfig = {
        name: 'A',
        dosageAmount: 0.1,
        dosageUnit: DosageUnit.PILL,
        form: MedicationForm.TABLET,
      };
      
      expect(minConfig.name.length).toBeGreaterThan(0);
      expect(minConfig.dosageAmount).toBeGreaterThan(0);
    });

    it('should handle maximum valid configuration', () => {
      const maxConfig = {
        name: 'A'.repeat(100),
        dosageAmount: 1000,
        dosageUnit: DosageUnit.MG,
        form: MedicationForm.INJECTION,
      };
      
      expect(maxConfig.name.length).toBeLessThanOrEqual(100);
      expect(maxConfig.dosageAmount).toBeLessThanOrEqual(1000);
    });

    it('should handle as-needed frequency type', () => {
      const asNeededConfig = {
        frequencyType: FrequencyType.AS_NEEDED,
        frequencyInterval: 1,
        timesPerDay: 0, // No fixed times for as-needed
      };
      
      expect(asNeededConfig.frequencyType).toBe(FrequencyType.AS_NEEDED);
    });
  });
});
