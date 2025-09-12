import { Router } from 'express';
import { z } from 'zod';
import { OAuthTokensCreate } from '@squidbox/contracts';

import { requireAuthorization } from '../auth';
import { logger } from '../logger';
import { prisma } from '../prisma';

const router = Router();

router.get('/me', async (req, res) => {
  const user = await requireAuthorization(req, res);
  if (!user) return; // Response already sent by requireAuthorization

  res.json({ user });
});

// Store OAuth tokens endpoint
const tokensSchema = OAuthTokensCreate;

router.post('/tokens', async (req, res) => {
  const user = await requireAuthorization(req, res);
  if (!user) return; // Response already sent by requireAuthorization

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
    // Upsert OAuth tokens (update if exists, create if not)
    await prisma.oAuthToken.upsert({
      where: {
        userId_platform: {
          userId: user.id,
          platform,
        },
      },
      update: {
        accessToken,
        refreshToken,
        expiresIn,
        username,
        platformUserId,
      },
      create: {
        userId: user.id,
        platform,
        accessToken,
        refreshToken,
        expiresIn,
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

export default router;
