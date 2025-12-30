import { logger } from '../utils/logger';

export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  CALL = 'call',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  scheduledFor?: Date;
  expiresAt?: Date;
  language?: string;
}

export interface NotificationResult {
  id: string;
  channel: NotificationChannel;
  success: boolean;
  sentAt: Date;
  error?: string;
  externalId?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
}

// Predefined templates for medication reminders
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  MEDICATION_REMINDER: {
    id: 'medication_reminder',
    name: 'Medication Reminder',
    titleTemplate: 'Time for {{medicationName}}',
    bodyTemplate: 'Take {{dosage}} {{dosageUnit}} of {{medicationName}}',
    channels: [NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
  },
  MEDICATION_REMINDER_REPEAT: {
    id: 'medication_reminder_repeat',
    name: 'Medication Reminder (Repeat)',
    titleTemplate: 'Reminder: {{medicationName}}',
    bodyTemplate: "Don't forget to take {{dosage}} {{dosageUnit}} of {{medicationName}}",
    channels: [NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
  },
  MEDICATION_MISSED: {
    id: 'medication_missed',
    name: 'Medication Missed',
    titleTemplate: 'Missed: {{medicationName}}',
    bodyTemplate: 'You missed your {{medicationName}} dose scheduled for {{scheduledTime}}',
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
  },
  REFILL_REMINDER: {
    id: 'refill_reminder',
    name: 'Refill Reminder',
    titleTemplate: 'Low Supply: {{medicationName}}',
    bodyTemplate: 'You have {{remainingDoses}} doses left of {{medicationName}}. Time to refill!',
    channels: [NotificationChannel.PUSH],
    priority: NotificationPriority.NORMAL,
  },
  CAREGIVER_ALERT: {
    id: 'caregiver_alert',
    name: 'Caregiver Alert',
    titleTemplate: '{{patientName}} missed medication',
    bodyTemplate: '{{patientName}} missed their {{medicationName}} dose at {{scheduledTime}}',
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
  },
  EMERGENCY_ALERT: {
    id: 'emergency_alert',
    name: 'Emergency Alert',
    titleTemplate: 'URGENT: {{patientName}} needs attention',
    bodyTemplate: '{{patientName}} has missed multiple critical medication doses. Please check on them.',
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.CALL],
    priority: NotificationPriority.CRITICAL,
  },
};

export class NotificationService {
  private pendingNotifications: Map<string, NotificationPayload> = new Map();
  private deliveryResults: Map<string, NotificationResult[]> = new Map();

  // Template rendering
  renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, string>
  ): { title: string; body: string } {
    let title = template.titleTemplate;
    let body = template.bodyTemplate;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    }

    return { title, body };
  }

  // Send notification using template
  async sendFromTemplate(
    templateId: string,
    userId: string,
    variables: Record<string, string>,
    options?: {
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
      data?: Record<string, string>;
      language?: string;
    }
  ): Promise<NotificationResult[]> {
    const template = NOTIFICATION_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const { title, body } = this.renderTemplate(template, variables);

    return this.send({
      userId,
      title,
      body,
      channels: options?.channels || template.channels,
      priority: options?.priority || template.priority,
      data: options?.data,
      language: options?.language,
    });
  }

  // Send notification
  async send(payload: NotificationPayload): Promise<NotificationResult[]> {
    const notificationId = this.generateId();
    const results: NotificationResult[] = [];

    logger.info(`Sending notification ${notificationId} to user ${payload.userId}`, {
      channels: payload.channels,
      priority: payload.priority,
    });

    for (const channel of payload.channels) {
      try {
        const result = await this.sendToChannel(notificationId, channel, payload);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          id: notificationId,
          channel,
          success: false,
          sentAt: new Date(),
          error: errorMessage,
        });
        logger.error(`Failed to send notification via ${channel}`, { error: errorMessage });
      }
    }

    this.deliveryResults.set(notificationId, results);
    return results;
  }

  // Schedule notification for later
  async schedule(payload: NotificationPayload): Promise<string> {
    if (!payload.scheduledFor) {
      throw new Error('scheduledFor is required for scheduled notifications');
    }

    const notificationId = this.generateId();
    this.pendingNotifications.set(notificationId, payload);

    logger.info(`Scheduled notification ${notificationId} for ${payload.scheduledFor.toISOString()}`);
    return notificationId;
  }

  // Cancel scheduled notification
  async cancel(notificationId: string): Promise<boolean> {
    const deleted = this.pendingNotifications.delete(notificationId);
    if (deleted) {
      logger.info(`Cancelled notification ${notificationId}`);
    }
    return deleted;
  }

  // Get delivery status
  getDeliveryStatus(notificationId: string): NotificationResult[] | null {
    return this.deliveryResults.get(notificationId) || null;
  }

  // Channel-specific sending methods
  private async sendToChannel(
    notificationId: string,
    channel: NotificationChannel,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    switch (channel) {
      case NotificationChannel.PUSH:
        return this.sendPushNotification(notificationId, payload);
      case NotificationChannel.SMS:
        return this.sendSMS(notificationId, payload);
      case NotificationChannel.EMAIL:
        return this.sendEmail(notificationId, payload);
      case NotificationChannel.CALL:
        return this.sendVoiceCall(notificationId, payload);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  private async sendPushNotification(
    notificationId: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    // TODO: Integrate with FCM/APNs
    // For now, simulate successful delivery
    logger.info(`[PUSH] Sending to user ${payload.userId}: ${payload.title}`);
    
    return {
      id: notificationId,
      channel: NotificationChannel.PUSH,
      success: true,
      sentAt: new Date(),
      externalId: `push_${notificationId}`,
    };
  }

  private async sendSMS(
    notificationId: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    // TODO: Integrate with Twilio
    // For now, simulate successful delivery
    logger.info(`[SMS] Sending to user ${payload.userId}: ${payload.body}`);
    
    return {
      id: notificationId,
      channel: NotificationChannel.SMS,
      success: true,
      sentAt: new Date(),
      externalId: `sms_${notificationId}`,
    };
  }

  private async sendEmail(
    notificationId: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    // TODO: Integrate with email service
    logger.info(`[EMAIL] Sending to user ${payload.userId}: ${payload.title}`);
    
    return {
      id: notificationId,
      channel: NotificationChannel.EMAIL,
      success: true,
      sentAt: new Date(),
      externalId: `email_${notificationId}`,
    };
  }

  private async sendVoiceCall(
    notificationId: string,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    // TODO: Integrate with Twilio Voice
    logger.info(`[CALL] Initiating call to user ${payload.userId}: ${payload.body}`);
    
    return {
      id: notificationId,
      channel: NotificationChannel.CALL,
      success: true,
      sentAt: new Date(),
      externalId: `call_${notificationId}`,
    };
  }

  // Retry failed notification
  async retry(notificationId: string): Promise<NotificationResult[] | null> {
    const results = this.deliveryResults.get(notificationId);
    if (!results) {
      return null;
    }

    const failedChannels = results
      .filter(r => !r.success)
      .map(r => r.channel);

    if (failedChannels.length === 0) {
      return results;
    }

    // Get original payload from pending or reconstruct
    const pending = this.pendingNotifications.get(notificationId);
    if (!pending) {
      logger.warn(`Cannot retry notification ${notificationId}: payload not found`);
      return null;
    }

    const retryPayload = { ...pending, channels: failedChannels };
    return this.send(retryPayload);
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Batch send notifications
  async sendBatch(payloads: NotificationPayload[]): Promise<Map<string, NotificationResult[]>> {
    const results = new Map<string, NotificationResult[]>();
    
    await Promise.all(
      payloads.map(async (payload, index) => {
        const notificationResults = await this.send(payload);
        results.set(`batch_${index}`, notificationResults);
      })
    );

    return results;
  }

  // Get pending notifications for a user
  getPendingForUser(userId: string): NotificationPayload[] {
    return Array.from(this.pendingNotifications.values())
      .filter(n => n.userId === userId);
  }

  // Process scheduled notifications (called by job scheduler)
  async processScheduledNotifications(): Promise<number> {
    const now = new Date();
    let processed = 0;

    for (const [id, payload] of this.pendingNotifications) {
      if (payload.scheduledFor && payload.scheduledFor <= now) {
        // Check if expired
        if (payload.expiresAt && payload.expiresAt < now) {
          this.pendingNotifications.delete(id);
          logger.info(`Notification ${id} expired, removing`);
          continue;
        }

        await this.send(payload);
        this.pendingNotifications.delete(id);
        processed++;
      }
    }

    return processed;
  }
}

export const notificationService = new NotificationService();
