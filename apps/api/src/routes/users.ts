import { Router } from 'express';
import { OAuthTokensCreate, SUPPORTED_PLATFORMS } from '@squidbox/contracts';
import { Platform } from '@prisma/client';

import { authenticateToken, AuthenticatedRequest } from '../auth';
import { logger } from '../logger';
import { prisma } from '../prisma';

const router = Router();

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// Store OAuth tokens endpoint
const tokensSchema = OAuthTokensCreate;

router.post('/tokens', authenticateToken, async (req: AuthenticatedRequest, res) => {
  logger.info({ userId: req.user!.id, body: req.body }, 'Received token storage request');

  // Validate request body
  const parsed = tokensSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.error({ userId: req.user!.id, error: parsed.error.flatten() }, 'Token validation failed');
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const {
    platform,
    accessToken,
    refreshToken,
    expiresIn,
    username,
    platformUserId,
  } = parsed.data;

  logger.info({ 
    userId: req.user!.id, 
    platform, 
    username, 
    platformUserId,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    expiresIn 
  }, 'Processing token storage');

  // Calculate expiration date
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  logger.info({ 
    userId: req.user!.id, 
    platform, 
    expiresAt 
  }, 'Storing tokens in database');

  // Upsert OAuth tokens (update if exists, create if not)
  const result = await prisma.oAuthToken.upsert({
    where: {
      userId_platform: {
        userId: req.user!.id,
        platform,
      },
    },
    update: {
      accessToken,
      refreshToken,
      expiresIn,
      expiresAt,
      username,
      platformUserId,
    },
    create: {
      userId: req.user!.id,
      platform,
      accessToken,
      refreshToken,
      expiresIn,
      expiresAt,
      username,
      platformUserId,
    },
  });

  logger.info({ 
    userId: req.user!.id, 
    platform, 
    tokenId: result.id 
  }, 'Tokens stored successfully in database');

  res.json({
    success: true,
    message: 'Tokens stored successfully',
  });
});

// Get OAuth tokens for a specific platform
router.get('/tokens/:platform', authenticateToken, async (req: AuthenticatedRequest, res) => {

  const { platform } = req.params;

  if (!platform) {
    return res.status(400).json({ error: 'Platform parameter is required' });
  }

  // Validate platform parameter
  const validPlatforms = SUPPORTED_PLATFORMS.map(p => p.id);
  if (!validPlatforms.includes(platform as Platform)) {
    return res.status(400).json({ error: 'Invalid platform parameter' });
  }

  const token = await prisma.oAuthToken.findUnique({
    where: {
      userId_platform: {
        userId: req.user!.id,
        platform: platform as Platform,
      },
    },
  });

  if (!token) {
    return res.json({ success: true, data: null });
  }

  res.json({
    success: true,
    data: {
      platform: token.platform,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      username: token.username,
      userId: token.platformUserId,
    },
  });
});

// Check platform connection status
router.get('/platforms/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  logger.info({ userId: req.user!.id }, 'Checking platform connection status');

  const platforms = await prisma.oAuthToken.findMany({
    where: {
      userId: req.user!.id,
    },
    select: {
      platform: true,
      username: true,
      expiresAt: true,
    },
  });

  // Create a map of platform statuses
  const platformStatuses = SUPPORTED_PLATFORMS.map(platform => {
    const token = platforms.find(p => p.platform === platform.id);
    const isConnected = token && (!token.expiresAt || token.expiresAt > new Date());
    
    return {
      platform: platform.id,
      isConnected: Boolean(isConnected), // Ensure it's a boolean
      username: token?.username || null,
      expiresAt: token?.expiresAt || null,
    };
  });

  logger.info({ 
    userId: req.user!.id, 
    connectedPlatforms: platformStatuses.filter(p => p.isConnected).length 
  }, 'Platform status check completed');

  res.json(platformStatuses);
});

// Delete OAuth tokens for a specific platform
router.delete('/tokens/:platform', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { platform } = req.params;

  if (!platform) {
    return res.status(400).json({ error: 'Platform parameter is required' });
  }

  // Validate platform parameter
  const validPlatforms = SUPPORTED_PLATFORMS.map(p => p.id);
  if (!validPlatforms.includes(platform as Platform)) {
    return res.status(400).json({ error: 'Invalid platform parameter' });
  }

  logger.info({ userId: req.user!.id, platform }, 'Deleting platform tokens');

  try {
    const result = await prisma.oAuthToken.deleteMany({
      where: {
        userId: req.user!.id,
        platform: platform as Platform,
      },
    });

    if (result.count === 0) {
      logger.warn({ userId: req.user!.id, platform }, 'No tokens found to delete');
      return res.status(404).json({ error: 'No tokens found for this platform' });
    }

    logger.info({ 
      userId: req.user!.id, 
      platform, 
      deletedCount: result.count 
    }, 'Platform tokens deleted successfully');

    res.json({
      success: true,
      message: 'Platform disconnected successfully',
    });
  } catch (error) {
    logger.error({ userId: req.user!.id, platform, error }, 'Error deleting platform tokens');
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

export default router;
