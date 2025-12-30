import { Router, Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));

// Protected routes
router.get('/profile', authenticate as any, (req: Request, res: Response, next: NextFunction) => authController.getProfile(req as AuthenticatedRequest, res, next));
router.put('/profile', authenticate as any, (req: Request, res: Response, next: NextFunction) => authController.updateProfile(req as AuthenticatedRequest, res, next));
router.post('/change-password', authenticate as any, (req: Request, res: Response, next: NextFunction) => authController.changePassword(req as AuthenticatedRequest, res, next));
router.delete('/account', authenticate as any, (req: Request, res: Response, next: NextFunction) => authController.deleteAccount(req as AuthenticatedRequest, res, next));

export default router;
