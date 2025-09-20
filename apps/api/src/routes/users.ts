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

export default router;
