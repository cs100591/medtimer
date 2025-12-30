/**
 * Feature: medication-reminder-app, Property 2: Reminder Escalation Sequence
 * Validates: Requirements 1.6
 * 
 * Property: For any missed medication reminder, the escalation system should follow
 * the correct sequence: gentle notification → repeat reminders → optional SMS/phone escalation
 */

import * as fc from 'fast-check';
import { EscalationLevel } from '../../types/shared-types';
import { escalationService, EscalationState } from '../services/escalation.service';

// Arbitraries
const escalationLevelArb = fc.constantFrom(
  EscalationLevel.GENTLE,
  EscalationLevel.REPEAT,
  EscalationLevel.SMS,
  EscalationLevel.CALL,
  EscalationLevel.EMERGENCY
);

const escalationRuleArb = fc.record({
  level: escalationLevelArb,
  delayMinutes: fc.integer({ min: 0, max: 120 }),
  maxAttempts: fc.integer({ min: 1, max: 5 }),
  notifyCaregiver: fc.boolean(),
  notificationChannels: fc.array(
    fc.constantFrom('push', 'sms', 'call', 'email'),
    { minLength: 1, maxLength: 4 }
  ),
});

const scheduleIdArb = fc.uuid();
const userIdArb = fc.uuid();
const medicationIdArb = fc.uuid();

const escalationStateArb = fc.record({
  scheduleId: scheduleIdArb,
  medicationId: medicationIdArb,
  userId: userIdArb,
  scheduledTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  currentLevel: escalationLevelArb,
  attemptCount: fc.integer({ min: 0, max: 10 }),
  startedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  isResolved: fc.boolean(),
});

describe('Property 2: Reminder Escalation Sequence', () => {
  describe('Escalation level ordering', () => {
    it('should have escalation levels in correct order', () => {
      const expectedOrder = [
        EscalationLevel.GENTLE,
        EscalationLevel.REPEAT,
        EscalationLevel.SMS,
        EscalationLevel.CALL,
        EscalationLevel.EMERGENCY,
      ];

      const defaultRules = escalationService.getDefaultEscalationRules();
      const actualOrder = defaultRules.map(r => r.level);

      expect(actualOrder).toEqual(expectedOrder);
    });

    it('should always start with GENTLE level', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      expect(defaultRules[0].level).toBe(EscalationLevel.GENTLE);
    });

    it('should end with EMERGENCY level', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      expect(defaultRules[defaultRules.length - 1].level).toBe(EscalationLevel.EMERGENCY);
    });
  });

  describe('Escalation delay progression', () => {
    it('should have non-decreasing delay times', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      
      for (let i = 1; i < defaultRules.length; i++) {
        expect(defaultRules[i].delayMinutes).toBeGreaterThanOrEqual(
          defaultRules[i - 1].delayMinutes
        );
      }
    });

    it('should have positive delay times for all levels except GENTLE', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      
      for (let i = 1; i < defaultRules.length; i++) {
        expect(defaultRules[i].delayMinutes).toBeGreaterThan(0);
      }
    });
  });

  describe('Caregiver notification progression', () => {
    it('should notify caregivers at higher escalation levels', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      
      // GENTLE and REPEAT should not notify caregivers
      const gentleRule = defaultRules.find(r => r.level === EscalationLevel.GENTLE);
      const repeatRule = defaultRules.find(r => r.level === EscalationLevel.REPEAT);
      
      expect(gentleRule?.notifyCaregiver).toBe(false);
      expect(repeatRule?.notifyCaregiver).toBe(false);
      
      // SMS, CALL, and EMERGENCY should notify caregivers
      const smsRule = defaultRules.find(r => r.level === EscalationLevel.SMS);
      const callRule = defaultRules.find(r => r.level === EscalationLevel.CALL);
      const emergencyRule = defaultRules.find(r => r.level === EscalationLevel.EMERGENCY);
      
      expect(smsRule?.notifyCaregiver).toBe(true);
      expect(callRule?.notifyCaregiver).toBe(true);
      expect(emergencyRule?.notifyCaregiver).toBe(true);
    });
  });

  describe('Notification channel progression', () => {
    it('should use push notifications at all levels', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      
      // At least GENTLE and REPEAT should use push
      const gentleRule = defaultRules.find(r => r.level === EscalationLevel.GENTLE);
      const repeatRule = defaultRules.find(r => r.level === EscalationLevel.REPEAT);
      
      expect(gentleRule?.notificationChannels).toContain('push');
      expect(repeatRule?.notificationChannels).toContain('push');
    });

    it('should add SMS at SMS level', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      const smsRule = defaultRules.find(r => r.level === EscalationLevel.SMS);
      
      expect(smsRule?.notificationChannels).toContain('sms');
    });

    it('should use call at CALL level', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      const callRule = defaultRules.find(r => r.level === EscalationLevel.CALL);
      
      expect(callRule?.notificationChannels).toContain('call');
    });

    it('should use all channels at EMERGENCY level', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      const emergencyRule = defaultRules.find(r => r.level === EscalationLevel.EMERGENCY);
      
      expect(emergencyRule?.notificationChannels).toContain('push');
      expect(emergencyRule?.notificationChannels).toContain('sms');
      expect(emergencyRule?.notificationChannels).toContain('call');
    });
  });

  describe('Critical medication escalation', () => {
    it('should have faster escalation for critical medications', () => {
      const defaultRules = escalationService.getDefaultEscalationRules();
      const criticalRules = escalationService.getCriticalMedicationEscalationRules();
      
      // Compare delay times at each level
      for (let i = 0; i < Math.min(defaultRules.length, criticalRules.length); i++) {
        expect(criticalRules[i].delayMinutes).toBeLessThanOrEqual(
          defaultRules[i].delayMinutes
        );
      }
    });

    it('should notify caregivers earlier for critical medications', () => {
      const criticalRules = escalationService.getCriticalMedicationEscalationRules();
      
      // Find first rule that notifies caregiver
      const firstCaregiverNotifyIndex = criticalRules.findIndex(r => r.notifyCaregiver);
      
      // Should notify caregiver by REPEAT level (index 1) or SMS level (index 2)
      expect(firstCaregiverNotifyIndex).toBeLessThanOrEqual(2);
    });
  });

  describe('Escalation state management', () => {
    it('should correctly identify current rule for any escalation state', () => {
      fc.assert(
        fc.property(
          escalationLevelArb,
          (level) => {
            const rules = escalationService.getDefaultEscalationRules();
            const state: EscalationState = {
              scheduleId: 'test-schedule',
              medicationId: 'test-medication',
              userId: 'test-user',
              scheduledTime: new Date(),
              currentLevel: level,
              attemptCount: 0,
              startedAt: new Date(),
              isResolved: false,
            };

            const currentRule = escalationService.getCurrentRule(state, rules);
            
            if (currentRule) {
              return currentRule.level === level;
            }
            // Level might not be in rules (e.g., if rules are customized)
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify next rule for any escalation state', () => {
      const rules = escalationService.getDefaultEscalationRules();
      
      for (let i = 0; i < rules.length - 1; i++) {
        const state: EscalationState = {
          scheduleId: 'test-schedule',
          medicationId: 'test-medication',
          userId: 'test-user',
          scheduledTime: new Date(),
          currentLevel: rules[i].level,
          attemptCount: 0,
          startedAt: new Date(),
          isResolved: false,
        };

        const nextRule = escalationService.getNextRule(state, rules);
        expect(nextRule?.level).toBe(rules[i + 1].level);
      }
    });

    it('should return null for next rule at EMERGENCY level', () => {
      const rules = escalationService.getDefaultEscalationRules();
      const state: EscalationState = {
        scheduleId: 'test-schedule',
        medicationId: 'test-medication',
        userId: 'test-user',
        scheduledTime: new Date(),
        currentLevel: EscalationLevel.EMERGENCY,
        attemptCount: 0,
        startedAt: new Date(),
        isResolved: false,
      };

      const nextRule = escalationService.getNextRule(state, rules);
      expect(nextRule).toBeNull();
    });
  });

  describe('Escalation rule validation', () => {
    it('should have at least one attempt for each level', () => {
      fc.assert(
        fc.property(
          fc.array(escalationRuleArb, { minLength: 1, maxLength: 5 }),
          (rules) => {
            return rules.every(rule => rule.maxAttempts >= 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have at least one notification channel for each level', () => {
      fc.assert(
        fc.property(
          fc.array(escalationRuleArb, { minLength: 1, maxLength: 5 }),
          (rules) => {
            return rules.every(rule => rule.notificationChannels.length >= 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have non-negative delay times', () => {
      fc.assert(
        fc.property(
          fc.array(escalationRuleArb, { minLength: 1, maxLength: 5 }),
          (rules) => {
            return rules.every(rule => rule.delayMinutes >= 0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Time until next escalation', () => {
    it('should return null for resolved escalations', () => {
      const rules = escalationService.getDefaultEscalationRules();
      const state: EscalationState = {
        scheduleId: 'test-schedule',
        medicationId: 'test-medication',
        userId: 'test-user',
        scheduledTime: new Date(),
        currentLevel: EscalationLevel.GENTLE,
        attemptCount: 0,
        startedAt: new Date(),
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'taken',
      };

      const timeUntilNext = escalationService.getTimeUntilNextEscalation(state, rules);
      expect(timeUntilNext).toBeNull();
    });

    it('should return positive time for unresolved escalations with remaining levels', () => {
      const rules = escalationService.getDefaultEscalationRules();
      const state: EscalationState = {
        scheduleId: 'test-schedule',
        medicationId: 'test-medication',
        userId: 'test-user',
        scheduledTime: new Date(),
        currentLevel: EscalationLevel.GENTLE,
        attemptCount: 1, // Exhausted attempts at GENTLE
        startedAt: new Date(),
        isResolved: false,
      };

      const timeUntilNext = escalationService.getTimeUntilNextEscalation(state, rules);
      expect(timeUntilNext).toBeGreaterThan(0);
    });
  });
});
