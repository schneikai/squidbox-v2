import { type Platform, type PostResult, type PlatformPost } from '@squidbox/contracts';
import { logger } from '../logger.js';
import * as twitterProvider from './providers/twitter.js';
import * as blueskyProvider from './providers/bluesky.js';
import * as onlyfansProvider from './providers/onlyfans.js';
import * as jffProvider from './providers/jff.js';

const platformProviders = {
  twitter: twitterProvider,
  bluesky: blueskyProvider,
  onlyfans: onlyfansProvider,
  jff: jffProvider,
} as const;

/**
 * Post content to a specific platform
 */
export async function postToPlatform(
  userId: string,
  platformPost: PlatformPost
): Promise<PostResult> {
  try {
    logger.info({ userId, platform: platformPost.platform }, 'Starting platform post');
    const provider = getProvider(platformPost.platform);
    const result = await provider.post(userId, platformPost);
    logger.info({ userId, platform: platformPost.platform, success: result.success }, 'Platform post completed');
    return result;
  } catch (error) {
    logger.error({ err: error, platform: platformPost.platform }, 'Error posting to platform');
    return {
      platform: platformPost.platform,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user has valid authentication for a platform
 */
export async function isConnected(userId: string, platform: Platform): Promise<boolean> {
  try {
    const provider = getProvider(platform);
    return await provider.isConnected(userId);
  } catch (error) {
    logger.error({ err: error, platform }, 'Error checking platform connection');
    return false;
  }
}

function getProvider(platform: Platform) {
  const provider = platformProviders[platform];
  if (!provider) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return provider;
}
