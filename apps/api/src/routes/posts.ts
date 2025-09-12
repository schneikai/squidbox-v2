import { Router } from 'express';
import { createTweet } from '@squidbox/twitter-api';
import { CreatePostRequest, CreatePostResponse, PostResult } from '@squidbox/contracts';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';


const router = Router();


/**
 * Create a new post and send it to the specified platforms
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // Validate request body
    const validationResult = CreatePostRequest.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { platformPosts } = validationResult.data;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const platformResults: PostResult[] = [];
    let successCount = 0;

    // Process each platform post
    for (const platformPost of platformPosts) {
      try {
        let result: PostResult;

        switch (platformPost.platform) {
          case 'twitter':
            result = await handleTwitterPost(userId, platformPost);
            break;
          case 'bluesky':
            // TODO: Implement Bluesky posting
            result = {
              platform: 'bluesky',
              success: false,
              error: 'Bluesky posting not yet implemented',
            };
            break;
          case 'onlyfans':
            // TODO: Implement OnlyFans posting
            result = {
              platform: 'onlyfans',
              success: false,
              error: 'OnlyFans posting not yet implemented',
            };
            break;
          case 'jff':
            // TODO: Implement JFF posting
            result = {
              platform: 'jff',
              success: false,
              error: 'JFF posting not yet implemented',
            };
            break;
          default:
            result = {
              platform: platformPost.platform,
              success: false,
              error: `Unsupported platform: ${platformPost.platform}`,
            };
        }

        platformResults.push(result);
        if (result.success) {
          successCount++;
        }
      } catch (error) {
        logger.error({ err: error }, 'Error processing platform post');
        platformResults.push({
          platform: platformPost.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Determine overall status
    const status = successCount === platformPosts.length ? 'success' : 
                   successCount > 0 ? 'partial' : 'failed';

    const response: CreatePostResponse = {
      id: postId,
      status,
      platformResults,
      createdAt: new Date().toISOString(),
    };

    // Store the post in database
    try {
      await prisma.post.create({
        data: {
          id: postId,
          userId,
          content: JSON.stringify(platformPosts),
          status,
          platformResults: JSON.stringify(platformResults),
        },
      });
    } catch (dbError) {
      logger.error({ err: dbError }, 'Error storing post in database');
      // Don't fail the request if database storage fails
    }

    res.json(response);
  } catch (error) {
    logger.error({ err: error }, 'Error creating post');
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Handle Twitter post creation
 */
async function handleTwitterPost(userId: string, platformPost: any): Promise<PostResult> {
  try {
    // Get user's Twitter tokens
    const tokens = await prisma.oAuthToken.findFirst({
      where: {
        userId,
        platform: 'twitter',
      },
    });

    if (!tokens) {
      return {
        platform: 'twitter',
        success: false,
        error: 'Twitter authentication not found. Please connect your Twitter account.',
      };
    }

    // Check if token is expired
    if (tokens.expiresAt && tokens.expiresAt < new Date()) {
      return {
        platform: 'twitter',
        success: false,
        error: 'Twitter token expired. Please reconnect your Twitter account.',
      };
    }

    let mediaIds: string[] = [];

    // Upload media if present
    if (platformPost.media && platformPost.media.length > 0) {
      for (let i = 0; i < platformPost.media.length; i++) {
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
    const tweetResult = await createTweet(tokens.accessToken, {
      text: platformPost.text,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      replyToTweetId: platformPost.replyToId,
    });

    if (tweetResult.success) {
      return {
        platform: 'twitter',
        success: true,
        postId: tweetResult.tweetId,
      };
    } else {
      return {
        platform: 'twitter',
        success: false,
        error: tweetResult.error || 'Failed to create tweet',
      };
    }
  } catch (error) {
    logger.error({ err: error }, 'Error handling Twitter post');
    return {
      platform: 'twitter',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default router;
