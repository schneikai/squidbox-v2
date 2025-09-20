import { Router } from 'express';
import { CreatePostRequest, CreatePostResponse, PostResult, PlatformPost } from '@squidbox/contracts';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';
import { postToPlatform } from '../services/platformService.js';
import { createPostMediaEntries } from '../utils/createPostMediaEntries';
import { downloadPostMedia } from '../utils/downloadPostMedia';


const router = Router();

/**
 * Create a new post and send it to the specified platforms
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  // Validate request body
  const validationResult = CreatePostRequest.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: validationResult.error.issues,
    });
  }

  const { postGroups } = validationResult.data;
  
  // Unpack the grouped structure into individual platform posts
  const platformPosts: PlatformPost[] = [];
  for (const group of postGroups) {
    for (const post of group.posts) {
      for (const platform of group.platforms) {
        platformPosts.push({
          platform,
          post: {
            text: post.text,
            media: post.media,
          },
        });
      }
    }
  }
  
  // Step 1: Create all database entries first
  const createdPosts = [];
  for (const platformPost of platformPosts) {
    // Create a separate Post record for each platform
    const dbPost = await prisma.post.create({
      data: {
        userId: req.user!.id,
        platform: platformPost.platform,
        text: platformPost.post.text,
        status: 'pending',
      },
    });
    
    // Create media items and link them to the post (without downloading)
    if (platformPost.post.media.length > 0) {
      await createPostMediaEntries(dbPost.id, platformPost.post.media);
    }
    
    createdPosts.push(dbPost);
    logger.info({ postId: dbPost.id, platform: platformPost.platform }, 'Created post and media database entries');
  }

  // Step 2: Download media files for all posts
  for (const dbPost of createdPosts) {
    await downloadPostMedia(dbPost.id);
    logger.info({ postId: dbPost.id }, 'Downloaded all media files');
  }

  // Step 3: Post to platforms
  const platformResults: PostResult[] = [];
  let successCount = 0;
  let totalPosts = platformPosts.length;

  // Process each created post
  for (let i = 0; i < createdPosts.length; i++) {
    const dbPost = createdPosts[i];
    const platformPost = platformPosts[i];
    
    if (!dbPost || !platformPost) {
      logger.error({ index: i }, 'Missing post data at index');
      continue;
    }

    // Get the media for this post from the database
    const postWithMedia = await prisma.post.findUnique({
      where: { id: dbPost.id },
      include: {
        postMedia: {
          include: {
            media: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    const media = postWithMedia?.postMedia.map(pm => ({
      type: pm.media.type,
      url: pm.media.url,
      id: pm.media.id,
      uri: pm.media.url,
    })) || [];

    const result = await postToPlatform(req.user!.id, {
      platform: platformPost.platform,
      post: {
        text: platformPost.post.text,
        media,
      },
    });

    // Create posting result record after successful attempt
    await prisma.postingResult.create({
      data: {
        postId: dbPost.id,
        platform: dbPost.platform,
        success: result.success,
        platformPostId: result.platformPostId,
        error: result.error,
      },
    });

    // Update post status
    await prisma.post.update({
      where: { id: dbPost.id },
      data: {
        status: result.success ? 'success' : 'failed',
      },
    });

    platformResults.push({
      platform: result.platform,
      success: result.success,
      platformPostId: result.platformPostId,
      error: result.error,
    });

    if (result.success) {
      successCount++;
    }
  }

  // Determine final status
  const finalStatus = successCount === totalPosts ? 'success' : 
                     successCount > 0 ? 'partial' : 'failed';

  // Return the first post's ID as the main response ID (for backward compatibility)
  const response: CreatePostResponse = {
    id: createdPosts[0]?.id || '',
    status: finalStatus,
    platformResults,
    createdAt: createdPosts[0]?.createdAt.toISOString() || new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Get post status by ID
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const post = await prisma.post.findFirst({
    where: {
      id,
      userId: req.user!.id, // Ensure user can only access their own posts
    },
    include: {
      postingResults: true,
      postMedia: {
        include: {
          media: {
            include: {
              downloadResult: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!post) {
    return res.status(404).json({
      error: 'Post not found',
      message: 'The requested post does not exist or you do not have access to it',
    });
  }

  // Map posting results to the expected format
  const platformResults = post.postingResults.map(pr => ({
    platform: pr.platform,
    success: pr.success,
    platformPostId: pr.platformPostId || undefined,
    error: pr.error || undefined,
  }));

  // Map media to the expected format
  const media = post.postMedia.map(pm => ({
    type: pm.media.type,
    url: pm.media.url,
    id: pm.media.id,
    uri: pm.media.url,
    localPath: pm.media.localPath || undefined,
    downloadStatus: pm.media.downloadResult?.status || undefined,
    downloadError: pm.media.downloadResult?.error || undefined,
  }));

  res.json({
    id: post.id,
    text: post.text,
    media,
    status: post.status,
    platformResults,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
});

export default router;
