import { Router, Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

// Profile routes (alias for auth profile routes)
router.get('/profile', (req: Request, res: Response, next: NextFunction) => authController.getProfile(req as AuthenticatedRequest, res, next));
router.put('/profile', (req: Request, res: Response, next: NextFunction) => authController.updateProfile(req as AuthenticatedRequest, res, next));

export default router;
