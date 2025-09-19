import { type PostResult, type PlatformPost } from '@squidbox/contracts';
import { logger } from '../../logger.js';

/**
 * Check if user has valid OnlyFans authentication
 */
export async function isConnected(userId: string): Promise<boolean> {
  try {
    // TODO: Implement actual OnlyFans authentication check
    // For now, return false as it's not implemented
    logger.warn('OnlyFans authentication check not yet implemented');
    return false;
  } catch (error) {
    logger.error({ err: error, userId }, 'Error checking OnlyFans connection');
    return false;
  }
}

/**
 * Post content to OnlyFans
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function post(userId: string, platformPost: PlatformPost): Promise<PostResult> {
  try {
    // TODO: Implement actual OnlyFans posting
    logger.warn('OnlyFans posting not yet implemented');
    return {
      platform: 'onlyfans',
      success: false,
      error: 'OnlyFans posting not yet implemented',
    };
  } catch (error) {
    logger.error({ err: error, userId }, 'Error posting to OnlyFans');
    return {
      platform: 'onlyfans',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
