import { Router } from 'express';
import { SUPPORTED_PLATFORMS } from '@squidbox/contracts';

import { authenticateToken, AuthenticatedRequest } from '../../auth';
import { logger } from '../../logger';
import { getPrisma } from '../../prisma';

const router = Router();

// Check platform connection status
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  logger.info({ userId: req.user!.id }, 'Checking platform connection status');

  // Get OAuth tokens
  const oauthTokens = await getPrisma().oAuthToken.findMany({
    where: {
      userId: req.user!.id,
    },
    select: {
      platform: true,
      username: true,
      expiresAt: true,
    },
  });

  // Get platform credentials
  const platformCredentials = await getPrisma().platformCredentials.findMany({
    where: {
      userId: req.user!.id,
    },
    select: {
      platform: true,
      username: true,
    },
  });

  // Create a map of platform statuses
  const platformStatuses = SUPPORTED_PLATFORMS.map(platform => {
    const token = oauthTokens.find(p => p.platform === platform.id);
    const credentials = platformCredentials.find(p => p.platform === platform.id);
    
    // Platform is connected if it has valid OAuth tokens OR platform credentials
    const hasValidToken = token && (!token.expiresAt || token.expiresAt > new Date());
    const hasCredentials = !!credentials;
    const isConnected = hasValidToken || hasCredentials;
    
    return {
      platform: platform.id,
      isConnected: Boolean(isConnected),
      username: token?.username || credentials?.username || null,
      expiresAt: token?.expiresAt || null,
    };
  });

  logger.info({ 
    userId: req.user!.id, 
    connectedPlatforms: platformStatuses.filter(p => p.isConnected).length 
  }, 'Platform status check completed');

  res.json(platformStatuses);
});

export default router;
