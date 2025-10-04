import { type Platform, type PlatformResult } from '@squidbox/contracts';
import { type PlatformPost } from '../types.js';
import { logger } from '../logger.js';
import * as twitterProvider from './providers/twitter.js';
import * as blueskyProvider from './providers/bluesky.js';
import * as onlyfansProvider from './providers/onlyfans.js';
import * as jffProvider from './providers/jff.js';

const platformProviders: Record<Platform, any> = {
  twitter: twitterProvider,
  bluesky: blueskyProvider,
  onlyfans: onlyfansProvider,
  jff: jffProvider,
};

/**
 * Post content to a specific platform
 */
export async function postToPlatform(
  userId: string,
  platformPost: PlatformPost
): Promise<PlatformResult> {
  logger.info({ userId, platform: platformPost.platform }, 'Starting platform post');
  const provider = getProvider(platformPost.platform);
  const result = await provider.post(userId, platformPost);
  logger.info({ userId, platform: platformPost.platform, success: result.success }, 'Platform post completed');
  return result;
}

/**
 * Check if user has valid authentication for a platform
 * @deprecated This function is not used. Platform status is checked directly in routes.
 */
async function isConnected(userId: string, platform: Platform): Promise<boolean> {
  const provider = getProvider(platform);
  return await provider.isConnected(userId);
}

function getProvider(platform: Platform) {
  const provider = platformProviders[platform];
  if (!provider) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return provider;
}
