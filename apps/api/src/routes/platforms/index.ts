import { Router } from 'express';

import credentialsRoutes from './credentials.js';
import statusRoutes from './status.js';
import tokensRoutes from './tokens.js';

const router = Router();

// Mount platform sub-routes
router.use('/tokens', tokensRoutes);
router.use('/credentials', credentialsRoutes);
router.use('/status', statusRoutes);

export default router;
