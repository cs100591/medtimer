import { EscalationLevel } from '../types/shared-types';
import { ScheduleEntity } from '../models/entities/Schedule.entity';
import { logger } from '../utils/logger';

export interface EscalationState {
  scheduleId: string;
  medicationId: string;
  userId: string;
  scheduledTime: Date;
  currentLevel: EscalationLevel;
  attemptCount: number;
  startedAt: Date;
  lastAttemptAt?: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: 'taken' | 'skipped' | 'timeout' | 'manual';
}

export interface EscalationRule {
  level: EscalationLevel;
  delayMinutes: number;
  maxAttempts: number;
  notifyCaregiver: boolean;
  notificationChannels: ('push' | 'sms' | 'call' | 'email')[];
}

export class EscalationService {
  private activeEscalations: Map<string, EscalationState> = new Map();

  getDefaultEscalationRules(): EscalationRule[] {
    return [
      {
        level: EscalationLevel.GENTLE,
        delayMinutes: 0,
        maxAttempts: 1,
        notifyCaregiver: false,
        notificationChannels: ['push'],
      },
      {
        level: EscalationLevel.REPEAT,
        delayMinutes: 15,
        maxAttempts: 2,
        notifyCaregiver: false,
        notificationChannels: ['push'],
      },
      {
        level: EscalationLevel.SMS,
        delayMinutes: 30,
        maxAttempts: 1,
        notifyCaregiver: true,
        notificationChannels: ['push', 'sms'],
      },
      {
        level: EscalationLevel.CALL,
        delayMinutes: 60,
        maxAttempts: 1,
        notifyCaregiver: true,
        notificationChannels: ['call'],
      },
      {
        level: EscalationLevel.EMERGENCY,
        delayMinutes: 120,
        maxAttempts: 1,
        notifyCaregiver: true,
        notificationChannels: ['push', 'sms', 'call'],
      },
    ];
  }

  getCriticalMedicationEscalationRules(): EscalationRule[] {
    return [
      {
        level: EscalationLevel.GENTLE,
        delayMinutes: 0,
        maxAttempts: 1,
        notifyCaregiver: false,
        notificationChannels: ['push'],
      },
      {
        level: EscalationLevel.REPEAT,
        delayMinutes: 5,
        maxAttempts: 2,
        notifyCaregiver: false,
        notificationChannels: ['push', 'sms'],
      },
      {
        level: EscalationLevel.SMS,
        delayMinutes: 15,
        maxAttempts: 1,
        notifyCaregiver: true,
        notificationChannels: ['push', 'sms'],
      },
      {
        level: EscalationLevel.CALL,
        delayMinutes: 30,
        maxAttempts: 1,
        notifyCaregiver: true,
        notificationChannels: ['call'],
      },
      {
        level: EscalationLevel.EMERGENCY,
        delayMinutes: 45,
        maxAttempts: 1,
        notifyCaregiver: true,
        notificationChannels: ['push', 'sms', 'call'],
      },
    ];
  }

  startEscalation(
    schedule: ScheduleEntity,
    scheduledTime: Date
  ): EscalationState {
    const key = this.getEscalationKey(schedule.id, scheduledTime);
    
    const state: EscalationState = {
      scheduleId: schedule.id,
      medicationId: schedule.medicationId,
      userId: schedule.userId,
      scheduledTime,
      currentLevel: EscalationLevel.GENTLE,
      attemptCount: 0,
      startedAt: new Date(),
      isResolved: false,
    };

    this.activeEscalations.set(key, state);
    logger.info(`Started escalation for schedule ${schedule.id} at ${scheduledTime.toISOString()}`);

    return state;
  }

  advanceEscalation(
    scheduleId: string,
    scheduledTime: Date,
    rules: EscalationRule[]
  ): EscalationState | null {
    const key = this.getEscalationKey(scheduleId, scheduledTime);
    const state = this.activeEscalations.get(key);

    if (!state || state.isResolved) {
      return null;
    }

    const currentRuleIndex = rules.findIndex(r => r.level === state.currentLevel);
    const currentRule = rules[currentRuleIndex];

    state.attemptCount++;
    state.lastAttemptAt = new Date();

    // Check if we should move to next level
    if (state.attemptCount >= currentRule.maxAttempts) {
      const nextRuleIndex = currentRuleIndex + 1;
      
      if (nextRuleIndex < rules.length) {
        state.currentLevel = rules[nextRuleIndex].level;
        state.attemptCount = 0;
        logger.info(`Advanced escalation for ${scheduleId} to level ${state.currentLevel}`);
      } else {
        // Max escalation reached
        this.resolveEscalation(scheduleId, scheduledTime, 'timeout');
        return state;
      }
    }

    this.activeEscalations.set(key, state);
    return state;
  }

  resolveEscalation(
    scheduleId: string,
    scheduledTime: Date,
    resolvedBy: 'taken' | 'skipped' | 'timeout' | 'manual'
  ): EscalationState | null {
    const key = this.getEscalationKey(scheduleId, scheduledTime);
    const state = this.activeEscalations.get(key);

    if (!state) {
      return null;
    }

    state.isResolved = true;
    state.resolvedAt = new Date();
    state.resolvedBy = resolvedBy;

    this.activeEscalations.set(key, state);
    logger.info(`Resolved escalation for ${scheduleId} by ${resolvedBy}`);

    // Clean up after a delay
    setTimeout(() => {
      this.activeEscalations.delete(key);
    }, 60000); // Keep for 1 minute for logging purposes

    return state;
  }

  getEscalationState(scheduleId: string, scheduledTime: Date): EscalationState | null {
    const key = this.getEscalationKey(scheduleId, scheduledTime);
    return this.activeEscalations.get(key) || null;
  }

  getActiveEscalations(userId?: string): EscalationState[] {
    const escalations = Array.from(this.activeEscalations.values())
      .filter(e => !e.isResolved);

    if (userId) {
      return escalations.filter(e => e.userId === userId);
    }

    return escalations;
  }

  getCurrentRule(state: EscalationState, rules: EscalationRule[]): EscalationRule | null {
    return rules.find(r => r.level === state.currentLevel) || null;
  }

  getNextRule(state: EscalationState, rules: EscalationRule[]): EscalationRule | null {
    const currentIndex = rules.findIndex(r => r.level === state.currentLevel);
    if (currentIndex === -1 || currentIndex >= rules.length - 1) {
      return null;
    }
    return rules[currentIndex + 1];
  }

  shouldNotifyCaregiver(state: EscalationState, rules: EscalationRule[]): boolean {
    const currentRule = this.getCurrentRule(state, rules);
    return currentRule?.notifyCaregiver || false;
  }

  getNotificationChannels(state: EscalationState, rules: EscalationRule[]): string[] {
    const currentRule = this.getCurrentRule(state, rules);
    return currentRule?.notificationChannels || ['push'];
  }

  getTimeUntilNextEscalation(state: EscalationState, rules: EscalationRule[]): number | null {
    if (state.isResolved) {
      return null;
    }

    const currentRule = this.getCurrentRule(state, rules);
    const nextRule = this.getNextRule(state, rules);

    if (!currentRule) {
      return null;
    }

    // If we haven't exhausted current level attempts
    if (state.attemptCount < currentRule.maxAttempts) {
      return currentRule.delayMinutes * 60 * 1000;
    }

    // If there's a next level
    if (nextRule) {
      return nextRule.delayMinutes * 60 * 1000;
    }

    return null;
  }

  private getEscalationKey(scheduleId: string, scheduledTime: Date): string {
    return `${scheduleId}-${scheduledTime.getTime()}`;
  }

  // Statistics
  getEscalationStats(): {
    active: number;
    resolved: number;
    byLevel: Record<EscalationLevel, number>;
  } {
    const escalations = Array.from(this.activeEscalations.values());
    
    const byLevel: Record<EscalationLevel, number> = {
      [EscalationLevel.GENTLE]: 0,
      [EscalationLevel.REPEAT]: 0,
      [EscalationLevel.SMS]: 0,
      [EscalationLevel.CALL]: 0,
      [EscalationLevel.EMERGENCY]: 0,
    };

    for (const e of escalations) {
      if (!e.isResolved) {
        byLevel[e.currentLevel]++;
      }
    }

    return {
      active: escalations.filter(e => !e.isResolved).length,
      resolved: escalations.filter(e => e.isResolved).length,
      byLevel,
    };
  }
}

export const escalationService = new EscalationService();
