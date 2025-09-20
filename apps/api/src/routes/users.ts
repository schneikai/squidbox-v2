import { Router } from 'express';

import { authenticateToken, AuthenticatedRequest } from '../auth';

const router = Router();

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
