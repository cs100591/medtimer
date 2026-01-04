import { Response, NextFunction } from 'express';
import { AdherenceStatus } from '../types/shared-types';
import { adherenceService } from '../services/adherence.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../middleware/error.middleware';

// 安全的数字解析辅助函数
function safeParseIntOptional(value: any, defaultValue: number): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export class AdherenceController {
  async logAdherence(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { scheduleId, scheduledTime, status, notes, location, method } = req.body;

      if (!scheduleId || !scheduledTime || !status) {
        throw new ValidationError('scheduleId, scheduledTime, and status are required');
      }

      if (!Object.values(AdherenceStatus).includes(status)) {
        throw new ValidationError('Invalid status value');
      }

      const record = await adherenceService.logAdherence(userId, {
        scheduleId,
        scheduledTime: new Date(scheduledTime),
        status,
        notes,
        location,
        method,
      });

      res.status(200).json({
        message: 'Adherence logged successfully',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  async markTaken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { scheduleId, scheduledTime, notes, location } = req.body;

      if (!scheduleId || !scheduledTime) {
        throw new ValidationError('scheduleId and scheduledTime are required');
      }

      const record = await adherenceService.logAdherence(userId, {
        scheduleId,
        scheduledTime: new Date(scheduledTime),
        status: AdherenceStatus.TAKEN,
        notes,
        location,
        method: 'manual',
      });

      res.status(200).json({
        message: 'Medication marked as taken',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }


  async markSkipped(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { scheduleId, scheduledTime, reason } = req.body;

      if (!scheduleId || !scheduledTime) {
        throw new ValidationError('scheduleId and scheduledTime are required');
      }

      const record = await adherenceService.logAdherence(userId, {
        scheduleId,
        scheduledTime: new Date(scheduledTime),
        status: AdherenceStatus.SKIPPED,
        notes: reason,
        method: 'manual',
      });

      res.status(200).json({
        message: 'Medication marked as skipped',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  async snooze(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { scheduleId, scheduledTime, snoozeMinutes, notes } = req.body;

      if (!scheduleId || !scheduledTime || !snoozeMinutes) {
        throw new ValidationError('scheduleId, scheduledTime, and snoozeMinutes are required');
      }

      const record = await adherenceService.snoozeReminder(userId, {
        scheduleId,
        scheduledTime: new Date(scheduledTime),
        snoozeMinutes,
        notes,
      });

      res.status(200).json({
        message: 'Reminder snoozed',
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { medicationId, scheduleId, status, startDate, endDate } = req.query;

      const records = await adherenceService.getAdherenceHistory(userId, {
        medicationId: medicationId as string,
        scheduleId: scheduleId as string,
        status: status as AdherenceStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.status(200).json({
        data: records,
        count: records.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const stats = await adherenceService.getStats(userId, start, end);

      res.status(200).json({ data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const report = await adherenceService.generateReport(userId, start, end);

      res.status(200).json({ data: report });
    } catch (error) {
      next(error);
    }
  }

  async getPending(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const records = await adherenceService.getPendingReminders(userId);

      res.status(200).json({
        data: records,
        count: records.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUpcoming(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { hours } = req.query;
      const hoursAhead = safeParseIntOptional(hours, 24);

      const records = await adherenceService.getUpcomingReminders(userId, hoursAhead);

      res.status(200).json({
        data: records,
        count: records.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportCSV(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const csv = await adherenceService.exportToCSV(userId, start, end);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=adherence_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const adherenceController = new AdherenceController();
