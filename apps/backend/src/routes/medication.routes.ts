import { Router, Request, Response, NextFunction } from 'express';
import { medicationController } from '../controllers/medication.controller';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// CRUD operations
router.post('/', (req: Request, res: Response, next: NextFunction) => medicationController.create(req as AuthenticatedRequest, res, next));
router.get('/', (req: Request, res: Response, next: NextFunction) => medicationController.list(req as AuthenticatedRequest, res, next));
router.get('/search', (req: Request, res: Response, next: NextFunction) => medicationController.search(req as AuthenticatedRequest, res, next));
router.get('/low-supply', (req: Request, res: Response, next: NextFunction) => medicationController.getLowSupply(req as AuthenticatedRequest, res, next));
router.get('/emergency', (req: Request, res: Response, next: NextFunction) => medicationController.getEmergencyInfo(req as AuthenticatedRequest, res, next));
router.get('/:id', (req: Request, res: Response, next: NextFunction) => medicationController.getById(req as AuthenticatedRequest, res, next));
router.put('/:id', (req: Request, res: Response, next: NextFunction) => medicationController.update(req as AuthenticatedRequest, res, next));
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => medicationController.delete(req as AuthenticatedRequest, res, next));

// Additional operations
router.post('/:id/deactivate', (req: Request, res: Response, next: NextFunction) => medicationController.deactivate(req as AuthenticatedRequest, res, next));
router.post('/:id/supply', (req: Request, res: Response, next: NextFunction) => medicationController.updateSupply(req as AuthenticatedRequest, res, next));
router.post('/:id/refill', (req: Request, res: Response, next: NextFunction) => medicationController.recordRefill(req as AuthenticatedRequest, res, next));

export default router;
