import Bull from 'bull';
import { config } from '../config';
import { scheduleService } from './schedule.service';
import { ScheduleEntity } from '../models/entities/Schedule.entity';
import { EscalationLevel } from '../types/shared-types';
import { logger } from '../utils/logger';
import { adherenceService } from './adherence.service';
import { medicationService } from './medication.service';
import { notificationService } from './notification.service';

export interface ReminderJob {
  scheduleId: string;
  medicationId: string;
  userId: string;
  scheduledTime: Date;
  escalationLevel: EscalationLevel;
  attemptCount: number;
}

export interface EscalationJob {
  scheduleId: string;
  medicationId: string;
  userId: string;
  originalScheduledTime: Date;
  currentLevel: EscalationLevel;
  attemptCount: number;
}

export class ReminderService {
  private reminderQueue: Bull.Queue<ReminderJob>;
  private escalationQueue: Bull.Queue<EscalationJob>;

  constructor() {
    const redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    };

    this.reminderQueue = new Bull<ReminderJob>('medication-reminders', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.escalationQueue = new Bull<EscalationJob>('reminder-escalations', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
      },
    });

    this.setupProcessors();
  }

  private setupProcessors(): void {
    this.reminderQueue.process(async (job) => {
      await this.processReminder(job.data);
    });

    this.escalationQueue.process(async (job) => {
      await this.processEscalation(job.data);
    });

    this.reminderQueue.on('failed', (job, err) => {
      logger.error(`Reminder job ${job.id} failed:`, err);
    });

    this.escalationQueue.on('failed', (job, err) => {
      logger.error(`Escalation job ${job.id} failed:`, err);
    });
  }

  async scheduleReminder(schedule: ScheduleEntity): Promise<void> {
    const nextReminder = scheduleService.calculateNextReminder(schedule);

    if (!nextReminder) {
      logger.debug(`No next reminder for schedule ${schedule.id}`);
      return;
    }

    const delay = nextReminder.getTime() - Date.now();

    if (delay < 0) {
      logger.warn(`Reminder time is in the past for schedule ${schedule.id}`);
      return;
    }

    const jobData: ReminderJob = {
      scheduleId: schedule.id,
      medicationId: schedule.medicationId,
      userId: schedule.userId,
      scheduledTime: nextReminder,
      escalationLevel: EscalationLevel.GENTLE,
      attemptCount: 0,
    };

    await this.reminderQueue.add(jobData, {
      delay,
      jobId: `reminder-${schedule.id}-${nextReminder.getTime()}`,
    });

    logger.info(`Scheduled reminder for ${schedule.id} at ${nextReminder.toISOString()}`);
  }

  async cancelReminders(scheduleId: string): Promise<void> {
    const jobs = await this.reminderQueue.getJobs(['delayed', 'waiting']);

    for (const job of jobs) {
      if (job.data.scheduleId === scheduleId) {
        await job.remove();
        logger.info(`Cancelled reminder job ${job.id} for schedule ${scheduleId}`);
      }
    }
  }

  async rescheduleReminders(schedule: ScheduleEntity): Promise<void> {
    await this.cancelReminders(schedule.id);
    await this.scheduleReminder(schedule);
  }

  private async processReminder(data: ReminderJob): Promise<void> {
    logger.info(`Processing reminder for schedule ${data.scheduleId}`);

    // Send the notification (implementation depends on notification service)
    await this.sendNotification(data);

    // Schedule escalation if needed
    await this.scheduleEscalation(data);

    // Schedule next reminder
    try {
      const schedule = await scheduleService.getSchedule(data.scheduleId, data.userId);
      await this.scheduleReminder(schedule);
    } catch (error) {
      logger.error(`Failed to schedule next reminder for ${data.scheduleId}:`, error);
    }
  }

  private async sendNotification(data: ReminderJob): Promise<void> {
    logger.info(`Sending ${data.escalationLevel} notification for medication ${data.medicationId}`);

    try {
      const medication = await medicationService.getMedication(data.medicationId, data.userId);

      let templateId = 'MEDICATION_REMINDER';
      if (data.escalationLevel !== EscalationLevel.GENTLE) {
        templateId = 'MEDICATION_REMINDER_REPEAT';
      }

      const scheduledTime = data.scheduledTime instanceof Date
        ? data.scheduledTime
        : new Date(data.scheduledTime);

      await notificationService.sendFromTemplate(
        templateId,
        data.userId,
        {
          medicationName: medication.name,
          dosage: medication.dosageAmount.toString(),
          dosageUnit: medication.dosageUnit,
          scheduledTime: scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      );
    } catch (error) {
      logger.error(`Failed to send notification for schedule ${data.scheduleId}:`, error);
    }
  }

  private async scheduleEscalation(data: ReminderJob): Promise<void> {
    try {
      const schedule = await scheduleService.getSchedule(data.scheduleId, data.userId);
      const escalationRules = schedule.getEscalationRules();

      const currentRuleIndex = escalationRules.findIndex(
        r => r.level === data.escalationLevel
      );

      if (currentRuleIndex === -1 || currentRuleIndex >= escalationRules.length - 1) {
        return; // No more escalation levels
      }

      const currentRule = escalationRules[currentRuleIndex];
      const nextRule = escalationRules[currentRuleIndex + 1];

      if (data.attemptCount >= currentRule.maxAttempts) {
        // Move to next escalation level
        const escalationData: EscalationJob = {
          scheduleId: data.scheduleId,
          medicationId: data.medicationId,
          userId: data.userId,
          originalScheduledTime: data.scheduledTime,
          currentLevel: nextRule.level,
          attemptCount: 0,
        };

        await this.escalationQueue.add(escalationData, {
          delay: nextRule.delayMinutes * 60 * 1000,
          jobId: `escalation-${data.scheduleId}-${nextRule.level}-${Date.now()}`,
        });

        logger.info(`Scheduled escalation to ${nextRule.level} for schedule ${data.scheduleId}`);
      }
    } catch (error) {
      logger.error(`Failed to schedule escalation for ${data.scheduleId}:`, error);
    }
  }

  private async processEscalation(data: EscalationJob): Promise<void> {
    logger.info(`Processing escalation ${data.currentLevel} for schedule ${data.scheduleId}`);

    // Check if medication was taken
    const scheduledTime = new Date(data.originalScheduledTime);
    const wasTaken = await adherenceService.wasRecentlyTaken(data.scheduleId, scheduledTime);

    if (wasTaken) {
      logger.info(`Medication ${data.medicationId} was taken, skipping escalation`);
      return;
    }

    // Send escalated notification
    const reminderData: ReminderJob = {
      scheduleId: data.scheduleId,
      medicationId: data.medicationId,
      userId: data.userId,
      scheduledTime: data.originalScheduledTime,
      escalationLevel: data.currentLevel,
      attemptCount: data.attemptCount,
    };

    await this.sendNotification(reminderData);

    // Schedule next escalation if needed
    await this.scheduleEscalation({
      ...reminderData,
      attemptCount: data.attemptCount + 1,
    });
  }

  async getQueueStats(): Promise<{
    reminders: { waiting: number; active: number; delayed: number; completed: number; failed: number };
    escalations: { waiting: number; active: number; delayed: number; completed: number; failed: number };
  }> {
    const [reminderCounts, escalationCounts] = await Promise.all([
      this.reminderQueue.getJobCounts(),
      this.escalationQueue.getJobCounts(),
    ]);

    return {
      reminders: reminderCounts,
      escalations: escalationCounts,
    };
  }

  async close(): Promise<void> {
    await this.reminderQueue.close();
    await this.escalationQueue.close();
  }
}

export const reminderService = new ReminderService();
