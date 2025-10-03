import { Router } from 'express';
import { PlatformCredentialsCreate, SUPPORTED_PLATFORMS } from '@squidbox/contracts';
import { Platform } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { authenticateToken, AuthenticatedRequest } from '../../auth';
import { logger } from '../../logger';
import { getPrisma } from '../../prisma';

const router = Router();

// Store platform credentials endpoint
const credentialsSchema = PlatformCredentialsCreate;

router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  logger.info({ userId: req.user!.id, body: req.body }, 'Received credentials storage request');

  // Validate request body
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.error({ userId: req.user!.id, error: parsed.error.flatten() }, 'Credentials validation failed');
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const {
    platform,
    username,
    password,
    totpSecret,
  } = parsed.data;

  logger.info({ 
    userId: req.user!.id, 
    platform, 
    username,
    hasTotp: !!totpSecret,
  }, 'Processing credentials storage');

  // Encrypt the password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  logger.info({ 
    userId: req.user!.id, 
    platform, 
    username 
  }, 'Storing credentials in database');

  // Upsert platform credentials (update if exists, create if not)
  const result = await getPrisma().platformCredentials.upsert({
    where: {
      userId_platform: {
        userId: req.user!.id,
        platform,
      },
    },
    update: {
      username,
      password: hashedPassword,
      totpSecret,
    },
    create: {
      userId: req.user!.id,
      platform,
      username,
      password: hashedPassword,
      totpSecret,
    },
  });

  logger.info({ 
    userId: req.user!.id, 
    platform, 
    credentialsId: result.id 
  }, 'Credentials stored successfully in database');

  res.json({
    success: true,
    message: 'Credentials stored successfully',
  });
});

// Get platform credentials for a specific platform
router.get('/:platform', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { platform } = req.params;

  if (!platform) {
    return res.status(400).json({ error: 'Platform parameter is required' });
  }

  // Validate platform parameter
  const validPlatforms = SUPPORTED_PLATFORMS.map(p => p.id);
  if (!validPlatforms.includes(platform as Platform)) {
    return res.status(400).json({ error: 'Invalid platform parameter' });
  }

  const credentials = await getPrisma().platformCredentials.findUnique({
    where: {
      userId_platform: {
        userId: req.user!.id,
        platform: platform as Platform,
      },
    },
  });

  if (!credentials) {
    return res.json({ success: true, data: null });
  }

  res.json({
    success: true,
    data: {
      platform: credentials.platform,
      username: credentials.username,
      hasTotp: !!credentials.totpSecret,
      createdAt: credentials.createdAt.toISOString(),
      updatedAt: credentials.updatedAt.toISOString(),
    },
  });
});

// Delete platform credentials for a specific platform
router.delete('/:platform', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { platform } = req.params;

  if (!platform) {
    return res.status(400).json({ error: 'Platform parameter is required' });
  }

  // Validate platform parameter
  const validPlatforms = SUPPORTED_PLATFORMS.map(p => p.id);
  if (!validPlatforms.includes(platform as Platform)) {
    return res.status(400).json({ error: 'Invalid platform parameter' });
  }

  logger.info({ userId: req.user!.id, platform }, 'Deleting platform credentials');

  try {
    const result = await getPrisma().platformCredentials.deleteMany({
      where: {
        userId: req.user!.id,
        platform: platform as Platform,
      },
    });

    if (result.count === 0) {
      logger.warn({ userId: req.user!.id, platform }, 'No credentials found to delete');
      return res.status(404).json({ error: 'No credentials found for this platform' });
    }

    logger.info({ 
      userId: req.user!.id, 
      platform, 
      deletedCount: result.count 
    }, 'Platform credentials deleted successfully');

    res.json({
      success: true,
      message: 'Platform credentials deleted successfully',
    });
  } catch (error) {
    logger.error({ userId: req.user!.id, platform, error }, 'Error deleting platform credentials');
    res.status(500).json({ error: 'Failed to delete platform credentials' });
  }
});

export default router;
