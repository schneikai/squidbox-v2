import { Router } from 'express';
import { OAuthTokensCreate } from '@squidbox/contracts';

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

  // Validate request body
  const parsed = tokensSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const {
    platform,
    accessToken,
    refreshToken,
    expiresIn,
    username,
    userId: platformUserId,
  } = parsed.data;

  try {
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Upsert OAuth tokens (update if exists, create if not)
    await prisma.oAuthToken.upsert({
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

    res.json({
      success: true,
      message: 'Tokens stored successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to store OAuth tokens');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get OAuth tokens for a specific platform
router.get('/tokens/:platform', authenticateToken, async (req: AuthenticatedRequest, res) => {

  const { platform } = req.params;

  if (!platform) {
    return res.status(400).json({ error: 'Platform parameter is required' });
  }

  try {
    const token = await prisma.oAuthToken.findUnique({
      where: {
        userId_platform: {
          userId: req.user!.id,
          platform,
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
  } catch (error) {
    logger.error({ err: error }, 'Failed to retrieve OAuth tokens');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
