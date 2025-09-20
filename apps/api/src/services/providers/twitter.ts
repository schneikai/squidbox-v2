import { createTweet, uploadMedia } from '@squidbox/twitter-api';
import { type PostResult, type PlatformPost } from '@squidbox/contracts';
import { prisma } from '../../prisma.js';
import { logger } from '../../logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import type { Media } from '@prisma/client';

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
    throw new Error('Twitter authentication not found. Please connect your Twitter account.');
  }

  // Check if token is expired
  if (tokens.expiresAt && tokens.expiresAt < new Date()) {
    logger.error({ userId, expiresAt: tokens.expiresAt }, 'Twitter token expired');
    throw new Error('Twitter token expired. Please reconnect your Twitter account.');
  }

  logger.info({ userId, hasAccessToken: !!tokens.accessToken }, 'Twitter tokens validated');

  let mediaIds: string[] = [];

  // Upload media if present
  if (platformPost.post.media && platformPost.post.media.length > 0) {
    for (let i = 0; i < platformPost.post.media.length; i++) {
        const mediaItem = platformPost.post.media[i] as Media;

      // Look up media record for localPath
      const dbMedia = mediaItem.id
        ? await prisma.media.findUnique({ where: { id: mediaItem.id } })
        : null;

      const localPath = dbMedia?.localPath;
      if (!localPath) {
        logger.warn({ mediaId: mediaItem.id, url: mediaItem.url }, 'No localPath for media, skipping upload');
        continue;
      }

      const fileBuffer = await fs.readFile(localPath);
      const mimeType = getMimeTypeFromPath(localPath, mediaItem.type);

        if (mimeType.startsWith('image/')) {
        const mediaId = await uploadMedia(tokens.accessToken, {
          file: fileBuffer,
          mediaType: mimeType as 'image/jpeg' | 'image/png' | 'image/gif',
        });
        mediaIds.push(mediaId);
        logger.info({ mediaId }, 'Uploaded image to Twitter');
      } else if (mimeType === 'video/mp4') {
        const mediaId = await uploadMedia(tokens.accessToken, {
          file: fileBuffer,
          mediaType: 'video/mp4',
        });
        mediaIds.push(mediaId);
        logger.info({ mediaId }, 'Uploaded video to Twitter');
      } else {
        logger.warn({ localPath, mimeType }, 'Unsupported media type for Twitter upload, skipping');
        continue;
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
  
  const tweetId = await createTweet(tokens.accessToken, {
    text: platformPost.post.text,
    mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    replyToTweetId: platformPost.replyToId,
  });

  logger.info({ tweetId }, 'Tweet created successfully');
  return {
    platform: 'twitter',
    success: true,
    platformPostId: tweetId,
  };
}

function getMimeTypeFromPath(filePath: string, fallbackKind: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    default:
      return fallbackKind === 'image' ? 'image/jpeg' : 'video/mp4';
  }
}
