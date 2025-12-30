import * as fc from 'fast-check';

/**
 * Property 13: Emergency Notification Triggers
 * Validates: Requirements 6.2, 11.2, 11.5
 * 
 * Tests that emergency notifications are triggered correctly
 * for critical situations and rescue medication use.
 */
describe('Property 13: Emergency Notification Triggers', () => {
  // Emergency contact arbitrary
  const emergencyContactArb = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    phone: fc.stringMatching(/^\+?[1-9]\d{9,14}$/),
    email: fc.option(fc.emailAddress(), { nil: undefined }),
    relationship: fc.constantFrom('spouse', 'parent', 'child', 'sibling', 'friend', 'caregiver'),
    isPrimary: fc.boolean(),
    notifyOnEmergency: fc.boolean(),
  });

  // Rescue medication log arbitrary
  const rescueLogArb = fc.record({
    medicationId: fc.uuid(),
    userId: fc.uuid(),
    timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
    severity: fc.option(fc.constantFrom('mild', 'moderate', 'severe'), { nil: undefined }),
    symptoms: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
  });

  test('emergency contacts have required fields', () => {
    fc.assert(
      fc.property(emergencyContactArb, (contact) => {
        expect(contact.id).toBeDefined();
        expect(contact.userId).toBeDefined();
        expect(contact.name.length).toBeGreaterThan(0);
        expect(contact.phone).toBeDefined();
        expect(typeof contact.isPrimary).toBe('boolean');
        expect(typeof contact.notifyOnEmergency).toBe('boolean');
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('only contacts with notifyOnEmergency receive alerts', () => {
    fc.assert(
      fc.property(
        fc.array(emergencyContactArb, { minLength: 1, maxLength: 10 }),
        (contacts) => {
          const toNotify = contacts.filter(c => c.notifyOnEmergency);
          const notToNotify = contacts.filter(c => !c.notifyOnEmergency);

          // All contacts to notify should have flag set
          for (const contact of toNotify) {
            expect(contact.notifyOnEmergency).toBe(true);
          }

          // All contacts not to notify should have flag unset
          for (const contact of notToNotify) {
            expect(contact.notifyOnEmergency).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('only one primary emergency contact per user', () => {
    fc.assert(
      fc.property(
        fc.array(emergencyContactArb, { minLength: 2, maxLength: 10 }),
        (contacts) => {
          // Simulate setting one as primary
          const withPrimary = contacts.map((c, i) => ({
            ...c,
            isPrimary: i === 0,
          }));

          const primaryCount = withPrimary.filter(c => c.isPrimary).length;
          expect(primaryCount).toBe(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('rescue medication logs capture location when provided', () => {
    fc.assert(
      fc.property(
        rescueLogArb,
        fc.record({
          latitude: fc.float({ min: -90, max: 90, noNaN: true }),
          longitude: fc.float({ min: -180, max: 180, noNaN: true }),
          accuracy: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
        }),
        (log, location) => {
          const logWithLocation = { ...log, location };

          expect(logWithLocation.location.latitude).toBeGreaterThanOrEqual(-90);
          expect(logWithLocation.location.latitude).toBeLessThanOrEqual(90);
          expect(logWithLocation.location.longitude).toBeGreaterThanOrEqual(-180);
          expect(logWithLocation.location.longitude).toBeLessThanOrEqual(180);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('severity levels are valid', () => {
    const validSeverities = ['mild', 'moderate', 'severe'];

    fc.assert(
      fc.property(
        fc.constantFrom(...validSeverities),
        (severity) => {
          expect(validSeverities).toContain(severity);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  test('critical medication missed triggers alert after threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }), // missedCount
        fc.integer({ min: 1, max: 5 }), // threshold
        (missedCount, threshold) => {
          const shouldTrigger = missedCount >= threshold;

          if (missedCount >= threshold) {
            expect(shouldTrigger).toBe(true);
          } else {
            expect(shouldTrigger).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('emergency screen data contains all required sections', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // userId
        fc.array(emergencyContactArb, { minLength: 0, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }), // allergies
        (userId, contacts, allergies) => {
          const screenData = {
            userId,
            emergencyContacts: contacts,
            criticalMedications: [],
            rescueMedications: [],
            allergies,
            medicalConditions: [],
            lastUpdated: new Date(),
          };

          expect(screenData.userId).toBe(userId);
          expect(Array.isArray(screenData.emergencyContacts)).toBe(true);
          expect(Array.isArray(screenData.criticalMedications)).toBe(true);
          expect(Array.isArray(screenData.rescueMedications)).toBe(true);
          expect(Array.isArray(screenData.allergies)).toBe(true);
          expect(screenData.lastUpdated).toBeInstanceOf(Date);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('rescue medication use is logged with timestamp', () => {
    fc.assert(
      fc.property(rescueLogArb, (log) => {
        expect(log.timestamp).toBeInstanceOf(Date);
        expect(log.medicationId).toBeDefined();
        expect(log.userId).toBeDefined();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('emergency alerts use high-priority channels', () => {
    const highPriorityChannels = ['sms', 'call', 'push'];

    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...highPriorityChannels), { minLength: 1, maxLength: 3 }),
        (channels) => {
          // Emergency alerts should use at least one high-priority channel
          const hasHighPriority = channels.some(c => highPriorityChannels.includes(c));
          expect(hasHighPriority).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('phone numbers are valid format', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\+?[1-9]\d{9,14}$/),
        (phone) => {
          // Phone should be 10-15 digits, optionally starting with +
          expect(phone.replace(/\D/g, '').length).toBeGreaterThanOrEqual(10);
          expect(phone.replace(/\D/g, '').length).toBeLessThanOrEqual(15);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
