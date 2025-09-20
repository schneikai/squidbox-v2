import { Router } from 'express';

import authRoutes from './auth';
import healthRoutes from './health';
import userRoutes from './users';
import postRoutes from './posts';
import platformRoutes from './platforms';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/health', healthRoutes);
router.use('/post', postRoutes);
router.use('/platforms', platformRoutes);

export default router;
