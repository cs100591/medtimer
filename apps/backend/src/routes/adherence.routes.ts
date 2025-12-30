import { Router, Request, Response, NextFunction } from 'express';
import { adherenceController } from '../controllers/adherence.controller';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Log adherence (generic)
router.post('/log', (req: Request, res: Response, next: NextFunction) => adherenceController.logAdherence(req as AuthenticatedRequest, res, next));

// Quick actions
router.post('/taken', (req: Request, res: Response, next: NextFunction) => adherenceController.markTaken(req as AuthenticatedRequest, res, next));
router.post('/skipped', (req: Request, res: Response, next: NextFunction) => adherenceController.markSkipped(req as AuthenticatedRequest, res, next));
router.post('/snooze', (req: Request, res: Response, next: NextFunction) => adherenceController.snooze(req as AuthenticatedRequest, res, next));

// Get adherence data
router.get('/history', (req: Request, res: Response, next: NextFunction) => adherenceController.getHistory(req as AuthenticatedRequest, res, next));
router.get('/stats', (req: Request, res: Response, next: NextFunction) => adherenceController.getStats(req as AuthenticatedRequest, res, next));
router.get('/report', (req: Request, res: Response, next: NextFunction) => adherenceController.getReport(req as AuthenticatedRequest, res, next));
router.get('/pending', (req: Request, res: Response, next: NextFunction) => adherenceController.getPending(req as AuthenticatedRequest, res, next));
router.get('/upcoming', (req: Request, res: Response, next: NextFunction) => adherenceController.getUpcoming(req as AuthenticatedRequest, res, next));

// Export
router.get('/export/csv', (req: Request, res: Response, next: NextFunction) => adherenceController.exportCSV(req as AuthenticatedRequest, res, next));

export default router;
