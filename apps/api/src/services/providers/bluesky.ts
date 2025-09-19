import { type PostResult, type PlatformPost } from '@squidbox/contracts';
import { logger } from '../../logger.js';

/**
 * Check if user has valid Bluesky authentication
 */
export async function isConnected(userId: string): Promise<boolean> {
  try {
    // TODO: Implement actual Bluesky authentication check
    // For now, return false as it's not implemented
    logger.warn('Bluesky authentication check not yet implemented');
    return false;
  } catch (error) {
    logger.error({ err: error, userId }, 'Error checking Bluesky connection');
    return false;
  }
}

/**
 * Post content to Bluesky
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function post(userId: string, platformPost: PlatformPost): Promise<PostResult> {
  try {
    // TODO: Implement actual Bluesky posting
    logger.warn('Bluesky posting not yet implemented');
    return {
      platform: 'bluesky',
      success: false,
      error: 'Bluesky posting not yet implemented',
    };
  } catch (error) {
    logger.error({ err: error, userId }, 'Error posting to Bluesky');
    return {
      platform: 'bluesky',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
