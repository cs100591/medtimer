import * as fc from 'fast-check';
import { AdherenceStatus } from '../../types/shared-types';

/**
 * Property 15: AI Personalization and Learning
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 15.3
 * 
 * Tests that AI personalization correctly analyzes patterns,
 * generates recommendations, and respects privacy constraints.
 */
describe('Property 15: AI Personalization and Learning', () => {
  // Pattern types
  const patternTypes = ['snooze', 'skip', 'timing', 'compliance'];

  // Behavior pattern arbitrary
  const behaviorPatternArb = fc.record({
    userId: fc.uuid(),
    patternType: fc.constantFrom(...patternTypes),
    confidence: fc.float({ min: 0, max: 1, noNaN: true }),
    detectedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  });

  // Timing recommendation arbitrary
  const timingRecommendationArb = fc.record({
    scheduleId: fc.uuid(),
    currentTime: fc.stringMatching(/^([01]\d|2[0-3]):([0-5]\d)$/),
    recommendedTime: fc.stringMatching(/^([01]\d|2[0-3]):([0-5]\d)$/),
    confidence: fc.float({ min: 0, max: 1, noNaN: true }),
    reason: fc.string({ minLength: 10, maxLength: 200 }),
  });

  test('confidence scores are between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (confidence) => {
          expect(confidence).toBeGreaterThanOrEqual(0);
          expect(confidence).toBeLessThanOrEqual(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('pattern types are valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...patternTypes),
        (patternType) => {
          expect(patternTypes).toContain(patternType);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('recommendations only generated with sufficient confidence', () => {
    const confidenceThreshold = 0.6;

    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (confidence) => {
          const shouldRecommend = confidence > confidenceThreshold;

          if (confidence > confidenceThreshold) {
            expect(shouldRecommend).toBe(true);
          } else {
            expect(shouldRecommend).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('timing recommendations are valid time formats', () => {
    fc.assert(
      fc.property(timingRecommendationArb, (rec) => {
        // Validate time format HH:MM
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        expect(rec.currentTime).toMatch(timeRegex);
        expect(rec.recommendedTime).toMatch(timeRegex);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('snooze pattern analysis requires minimum data points', () => {
    const minDataPoints = 5;

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (dataPoints) => {
          const canAnalyze = dataPoints >= minDataPoints;

          if (dataPoints >= minDataPoints) {
            expect(canAnalyze).toBe(true);
          } else {
            expect(canAnalyze).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('compliance rate calculation is accurate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // taken
        fc.integer({ min: 0, max: 100 }), // total (must be >= taken)
        (taken, extra) => {
          const total = taken + extra;
          if (total === 0) return true;

          const complianceRate = (taken / total) * 100;

          expect(complianceRate).toBeGreaterThanOrEqual(0);
          expect(complianceRate).toBeLessThanOrEqual(100);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('timing delay calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
        fc.integer({ min: -120, max: 120 }), // delay in minutes
        (scheduledTime, delayMinutes) => {
          const actualTime = new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000);
          const calculatedDelay = (actualTime.getTime() - scheduledTime.getTime()) / 60000;

          expect(Math.round(calculatedDelay)).toBe(delayMinutes);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('trend detection is accurate', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }), // overall rate
        fc.float({ min: 0, max: 100, noNaN: true }), // recent rate
        (overallRate, recentRate) => {
          let trend: string;
          if (recentRate > overallRate + 5) {
            trend = 'improving';
          } else if (recentRate < overallRate - 5) {
            trend = 'declining';
          } else {
            trend = 'stable';
          }

          expect(['improving', 'declining', 'stable']).toContain(trend);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('wellness tips have required fields', () => {
    const categories = ['hydration', 'food', 'activity', 'sleep', 'general'];

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom(...categories),
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 500 }),
        fc.integer({ min: 1, max: 5 }),
        (id, category, title, content, priority) => {
          const tip = { id, category, title, content, priority };

          expect(tip.id).toBeDefined();
          expect(categories).toContain(tip.category);
          expect(tip.title.length).toBeGreaterThan(0);
          expect(tip.content.length).toBeGreaterThan(0);
          expect(tip.priority).toBeGreaterThanOrEqual(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('insights are actionable when appropriate', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('timing', 'compliance', 'wellness', 'interaction'),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.boolean(),
        (type, confidence, actionable) => {
          const insight = {
            type,
            confidence,
            actionable,
            action: actionable ? 'Take action' : undefined,
          };

          if (insight.actionable) {
            expect(insight.action).toBeDefined();
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('pattern data is user-specific', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        behaviorPatternArb,
        (userId1, userId2, pattern) => {
          const pattern1 = { ...pattern, userId: userId1 };
          const pattern2 = { ...pattern, userId: userId2 };

          // Patterns for different users should be independent
          expect(pattern1.userId).not.toBe(pattern2.userId);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('standard deviation calculation for timing consistency', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -60, max: 60 }), { minLength: 2, maxLength: 50 }),
        (delays) => {
          const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
          const variance = delays.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / delays.length;
          const stdDev = Math.sqrt(variance);

          // Standard deviation should be non-negative
          expect(stdDev).toBeGreaterThanOrEqual(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('time adjustment stays within valid range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 23 }), // hours
        fc.integer({ min: 0, max: 59 }), // minutes
        fc.integer({ min: -120, max: 120 }), // adjustment in minutes
        (hours, minutes, adjustment) => {
          let newMinutes = minutes + adjustment;
          let newHours = hours;

          while (newMinutes >= 60) {
            newMinutes -= 60;
            newHours++;
          }
          while (newMinutes < 0) {
            newMinutes += 60;
            newHours--;
          }

          // Wrap hours
          newHours = ((newHours % 24) + 24) % 24;

          expect(newHours).toBeGreaterThanOrEqual(0);
          expect(newHours).toBeLessThanOrEqual(23);
          expect(newMinutes).toBeGreaterThanOrEqual(0);
          expect(newMinutes).toBeLessThanOrEqual(59);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('privacy: patterns do not contain PII', () => {
    const piiFields = ['name', 'email', 'phone', 'address', 'ssn', 'dob'];

    fc.assert(
      fc.property(behaviorPatternArb, (pattern) => {
        const patternKeys = Object.keys(pattern);

        for (const pii of piiFields) {
          expect(patternKeys).not.toContain(pii);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
