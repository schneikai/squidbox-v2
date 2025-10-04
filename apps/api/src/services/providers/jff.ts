import { type PlatformResult } from '@squidbox/contracts';
import { type PlatformPost } from '../../types.js';
import { logger } from '../../logger.js';

/**
 * Check if user has valid JFF authentication
 */
export async function isConnected(userId: string): Promise<boolean> {
  try {
    // TODO: Implement actual JFF authentication check
    // For now, return false as it's not implemented
    logger.warn('JFF authentication check not yet implemented');
    return false;
  } catch (error) {
    logger.error({ err: error, userId }, 'Error checking JFF connection');
    return false;
  }
}

/**
 * Post content to JFF
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function post(userId: string, platformPost: PlatformPost): Promise<PlatformResult> {
  try {
    // TODO: Implement actual JFF posting
    logger.warn('JFF posting not yet implemented');
    return {
      platform: 'jff',
      success: false,
      error: 'JFF posting not yet implemented',
    };
  } catch (error) {
    logger.error({ err: error, userId }, 'Error posting to JFF');
    return {
      platform: 'jff',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
