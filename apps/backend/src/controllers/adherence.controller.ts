import { Request, Response, NextFunction } from 'express';
import { AdherenceStatus } from '../types/shared-types';
import { adherenceService } from '../services/adherence.service';
import { logger } from '../utils/logger';

export class AdherenceController {
  async logAdherence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { scheduleId, scheduledTime, status, notes, location, method } = req.body;

      if (!scheduleId || !scheduledTime || !status) {
        res.status(400).json({ error: 'scheduleId, scheduledTime, and status are required' });
        return;
      }

      if (!Object.values(AdherenceStatus).includes(status)) {
        res.status(400).json({ error: 'Invalid status value' });
        return;
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

  async markTaken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { scheduleId, scheduledTime, notes, location } = req.body;

      if (!scheduleId || !scheduledTime) {
        res.status(400).json({ error: 'scheduleId and scheduledTime are required' });
        return;
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


  async markSkipped(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { scheduleId, scheduledTime, reason } = req.body;

      if (!scheduleId || !scheduledTime) {
        res.status(400).json({ error: 'scheduleId and scheduledTime are required' });
        return;
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

  async snooze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { scheduleId, scheduledTime, snoozeMinutes, notes } = req.body;

      if (!scheduleId || !scheduledTime || !snoozeMinutes) {
        res.status(400).json({ error: 'scheduleId, scheduledTime, and snoozeMinutes are required' });
        return;
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

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
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

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const stats = await adherenceService.getStats(userId, start, end);

      res.status(200).json({ data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const report = await adherenceService.generateReport(userId, start, end);

      res.status(200).json({ data: report });
    } catch (error) {
      next(error);
    }
  }

  async getPending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const records = await adherenceService.getPendingReminders(userId);

      res.status(200).json({
        data: records,
        count: records.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { hours } = req.query;
      const hoursAhead = hours ? parseInt(hours as string, 10) : 24;

      const records = await adherenceService.getUpcomingReminders(userId, hoursAhead);

      res.status(200).json({
        data: records,
        count: records.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportCSV(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
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
