import { Router } from 'express';

import { logger } from '../logger';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed - database connection error');
    res.status(503).json({
      ok: false,
      database: 'disconnected',
      error: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
