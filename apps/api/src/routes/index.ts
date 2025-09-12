import { Router } from 'express';

import authRoutes from './auth';
import healthRoutes from './health';
import userRoutes from './users';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/health', healthRoutes);

export default router;
