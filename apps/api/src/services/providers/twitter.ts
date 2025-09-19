import { createTweet } from '@squidbox/twitter-api';
import { type PostResult, type PlatformPost } from '@squidbox/contracts';
import { prisma } from '../../prisma.js';
import { logger } from '../../logger.js';

/**
 * Check if user has valid Twitter authentication
 */
export async function isConnected(userId: string): Promise<boolean> {
  try {
    const tokens = await prisma.oAuthToken.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: 'twitter',
        },
      },
    });

    if (!tokens) {
      return false;
    }

    // Check if token is expired
    if (tokens.expiresAt && tokens.expiresAt < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error({ err: error, userId }, 'Error checking Twitter connection');
    return false;
  }
}

/**
 * Post content to Twitter
 */
export async function post(userId: string, platformPost: PlatformPost): Promise<PostResult> {
  try {
    // Get user's Twitter tokens
    const tokens = await prisma.oAuthToken.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: 'twitter',
        },
      },
    });

    logger.info({ userId, hasTokens: !!tokens }, 'Retrieved Twitter tokens');

    if (!tokens) {
      logger.error({ userId }, 'No Twitter tokens found for user');
      return {
        platform: 'twitter',
        success: false,
        error: 'Twitter authentication not found. Please connect your Twitter account.',
      };
    }

    // Check if token is expired
    if (tokens.expiresAt && tokens.expiresAt < new Date()) {
      logger.error({ userId, expiresAt: tokens.expiresAt }, 'Twitter token expired');
      return {
        platform: 'twitter',
        success: false,
        error: 'Twitter token expired. Please reconnect your Twitter account.',
      };
    }

    logger.info({ userId, hasAccessToken: !!tokens.accessToken }, 'Twitter tokens validated');

    let mediaIds: string[] = [];

    // Upload media if present
    if (platformPost.post.media && platformPost.post.media.length > 0) {
      for (let i = 0; i < platformPost.post.media.length; i++) {
        try {
          // For now, we'll skip media upload as it requires file handling
          // TODO: Implement proper media upload from URLs
          logger.warn('Media upload not yet implemented, skipping media');
        } catch (mediaError) {
          logger.error({ err: mediaError }, 'Error uploading media');
          return {
            platform: 'twitter',
            success: false,
            error: 'Failed to upload media',
          };
        }
      }
    }

    // Create the tweet
    logger.info({ 
      userId, 
      text: platformPost.post.text, 
      mediaCount: platformPost.post.media?.length || 0,
      hasMediaIds: mediaIds.length > 0 
    }, 'Attempting to create tweet');
    
    const tweetResult = await createTweet(tokens.accessToken, {
      text: platformPost.post.text,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      replyToTweetId: platformPost.replyToId,
    });

    logger.info({ tweetResult }, 'Tweet creation result');

    if (tweetResult.success) {
      logger.info({ tweetId: tweetResult.tweetId }, 'Tweet created successfully');
      return {
        platform: 'twitter',
        success: true,
        platformPostId: tweetResult.tweetId,
      };
    } else {
      logger.error({ error: tweetResult.error }, 'Tweet creation failed');
      return {
        platform: 'twitter',
        success: false,
        error: tweetResult.error || 'Failed to create tweet',
      };
    }
  } catch (error) {
    logger.error({ err: error, userId }, 'Error posting to Twitter');
    return {
      platform: 'twitter',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
