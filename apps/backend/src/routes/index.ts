import { Router } from 'express';
import authRoutes from './auth.routes';
import medicationRoutes from './medication.routes';
import adherenceRoutes from './adherence.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/medications', medicationRoutes);
router.use('/adherence', adherenceRoutes);

export default router;
