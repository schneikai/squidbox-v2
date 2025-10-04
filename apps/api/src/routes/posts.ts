import { Router } from 'express';
import { CreatePostRequest, CreatePostResponse, PostsListResponse, PostDetailResponse } from '@squidbox/contracts';
import { PlatformPost } from '../types.js';
import { getPrisma } from '../prisma.js';
import { logger } from '../logger.js';
import { authenticateToken, AuthenticatedRequest } from '../auth.js';
import { createPostMediaEntries } from '../utils/createPostMediaEntries';
import { QUEUE_NAMES, downloadQueue, twitterQueue } from '../queue.js';


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

  // Generate a unique group ID for this batch of posts
  const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  // Step 1: Create all database entries with the same groupId
  const createdPosts = [];
  for (const platformPost of platformPosts) {
    // Create a separate Post record for each platform
    const dbPost = await getPrisma().post.create({
      data: {
        userId: req.user!.id,
        platform: platformPost.platform,
        text: platformPost.post.text,
        status: 'pending',
        groupId,
      },
    });
    
    // Create media items and link them to the post (without downloading)
    if (platformPost.post.media.length > 0) {
      await createPostMediaEntries(dbPost.id, platformPost.post.media);
    }
    
    createdPosts.push(dbPost);
    logger.info({ postId: dbPost.id, platform: platformPost.platform, groupId }, 'Created post and media database entries');
  }

  // Step 2: Enqueue a single download job for the entire group
  await downloadQueue.add('media:download', { groupId }, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 1000 },
  });

  const response: CreatePostResponse = {
    id: createdPosts[0]?.id || '',
    status: 'pending',
    platformResults: [],
    groupId,
    createdAt: createdPosts[0]?.createdAt.toISOString() || new Date().toISOString(),
  };

  res.json(response);
});

/**
 * Get status for a post group
 */
router.get('/group/:groupId/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { groupId } = req.params;

  // Verify the user has access to this group
  const post = await getPrisma().post.findFirst({ 
    where: { groupId, userId: req.user!.id },
    select: { id: true }
  });
  if (!post) return res.status(404).json({ error: 'Post group not found' });

  // Get all posts in the group
  const groupPosts = await getPrisma().post.findMany({
    where: { groupId },
    include: {
      postResults: true,
      postMedia: {
        include: {
          media: {
            include: {
              downloadResult: true,
            },
          },
        },
      },
    },
  });

  // Build status response
  const posts = groupPosts.map(groupPost => {
    // Check download progress
    const downloadResults = groupPost.postMedia
      .map(pm => pm.media.downloadResult)
      .filter(Boolean);

    let downloadStatus = 'pending';
    let downloadProgress = '';
    let downloadError = '';

    if (downloadResults.length > 0) {
      const workingCount = downloadResults.filter(r => r?.status === 'working').length;
      const successCount = downloadResults.filter(r => r?.status === 'success').length;
      const failedCount = downloadResults.filter(r => r?.status === 'failed').length;
      const total = downloadResults.length;

      if (workingCount > 0) {
        downloadStatus = 'working';
        downloadProgress = `${successCount}/${total} downloaded`;
      } else if (failedCount > 0) {
        downloadStatus = 'failed';
        downloadError = downloadResults.find(r => r?.status === 'failed')?.statusText || '';
      } else if (successCount === total) {
        downloadStatus = 'completed';
        downloadProgress = 'All media downloaded';
      }
    }

    // Check posting progress
    const postResult = groupPost.postResults[0];
    const postStatus = postResult?.status || 'pending';
    const postStatusText = postResult?.statusText || '';
    const platformPostId = postResult?.platformPostId || '';

    return {
      postId: groupPost.id,
      platform: groupPost.platform,
      text: groupPost.text,
      status: groupPost.status as 'pending' | 'success' | 'failed',
      downloadStatus: downloadStatus as 'pending' | 'working' | 'completed' | 'failed',
      downloadProgress,
      downloadError,
      postStatus: postStatus as 'pending' | 'working' | 'success' | 'failed',
      postStatusText,
      platformPostId,
    };
  });

  // Calculate overall group status
  const allCompleted = posts.every(p => p.status === 'success');
  const anyFailed = posts.some(p => p.status === 'failed');
  const anyWorking = posts.some(p => p.status === 'pending' || p.downloadStatus === 'working' || p.postStatus === 'working');
  
  let groupStatus: 'pending' | 'working' | 'success' | 'failed' = 'pending';
  if (allCompleted) {
    groupStatus = 'success';
  } else if (anyFailed) {
    groupStatus = 'failed';
  } else if (anyWorking) {
    groupStatus = 'working';
  }

  const response = {
    groupId: groupId || '',
    status: groupStatus,
    posts,
  };
  res.json(response);
});

/**
 * Retry all failed posts in a group
 */
router.post('/group/:groupId/retry', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { groupId } = req.params;

  // Verify the user has access to this group
  const post = await getPrisma().post.findFirst({ 
    where: { groupId, userId: req.user!.id },
    select: { id: true }
  });
  if (!post) return res.status(404).json({ error: 'Post group not found' });

  // Get all failed posts in the group
  const failedPosts = await getPrisma().post.findMany({
    where: { 
      groupId,
      status: 'failed'
    }
  });

  if (failedPosts.length === 0) {
    return res.json({ 
      ok: true, 
      message: 'No failed posts to retry',
      retriedCount: 0 
    });
  }

  // Cancel any existing jobs for this group to prevent race conditions
  const existingJobs = await downloadQueue.getJobs(['waiting', 'active', 'delayed'], 0, -1);
  for (const job of existingJobs) {
    if (job.data.groupId === groupId) {
      await job.remove();
    }
  }

  // Also cancel any existing posting jobs to prevent race conditions
  // We remove all pending/active/delayed jobs since retry will re-enqueue only what's needed
  const existingPostingJobs = await twitterQueue.getJobs(['waiting', 'active', 'delayed'], 0, -1);
  for (const job of existingPostingJobs) {
    await job.remove();
  }

  // Reset all posts in the group to pending
  await getPrisma().post.updateMany({
    where: { groupId },
    data: { status: 'pending' },
  });

  // Clear existing post results for retry
  await getPrisma().postResult.deleteMany({
    where: {
      postId: {
        in: failedPosts.map(p => p.id)
      }
    }
  });

  // Enqueue download job for the entire group with retryOnly flag
  // The download worker will then enqueue posting jobs for all posts in the group
  await downloadQueue.add('media:download', { groupId, retryOnly: true }, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 1000 },
  });

  const response = { 
    ok: true, 
    retriedCount: failedPosts.length,
    groupId: groupId || ''
  };
  res.json(response);
});

/**
 * Get all posts for the authenticated user
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    // Get posts with their media and results
    const posts = await getPrisma().post.findMany({
      where: { userId: req.user!.id },
      include: {
        postMedia: {
          include: {
            media: {
              include: {
                downloadResult: true
              }
            }
          }
        },
        postResults: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limitNum
    });

    // Get total count for pagination
    const totalCount = await getPrisma().post.count({
      where: { userId: req.user!.id }
    });

    // Transform the data for the response
    const transformedPosts = posts.map(post => {
      const latestResult = post.postResults[0];
      const mediaItems = post.postMedia.map(pm => ({
        id: pm.media.id,
        type: pm.media.type,
        url: pm.media.url,
        localPath: pm.media.localPath,
        downloadStatus: pm.media.downloadResult?.status || 'pending',
        downloadError: pm.media.downloadResult?.statusText || null
      }));

      return {
        id: post.id,
        platform: post.platform,
        text: post.text,
        status: post.status,
        groupId: post.groupId,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        media: mediaItems,
        postResult: latestResult ? {
          id: latestResult.id,
          status: latestResult.status,
          statusText: latestResult.statusText,
          platformPostId: latestResult.platformPostId,
          createdAt: latestResult.createdAt.toISOString()
        } : null
      };
    });

    res.json({
      posts: transformedPosts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    logger.error({ error, userId: req.user!.id }, 'Failed to fetch posts');
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * Get a specific post by ID
 */
router.get('/:postId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { postId } = req.params;

  try {
    const post = await getPrisma().post.findFirst({
      where: { 
        id: postId,
        userId: req.user!.id 
      },
      include: {
        postMedia: {
          include: {
            media: {
              include: {
                downloadResult: true
              }
            }
          }
        },
        postResults: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Transform the data for the response
    const mediaItems = post.postMedia.map(pm => ({
      id: pm.media.id,
      type: pm.media.type,
      url: pm.media.url,
      localPath: pm.media.localPath,
      downloadStatus: pm.media.downloadResult?.status || 'pending',
      downloadError: pm.media.downloadResult?.statusText || null
    }));

    const postResults = post.postResults.map(result => ({
      id: result.id,
      status: result.status,
      statusText: result.statusText,
      platformPostId: result.platformPostId,
      createdAt: result.createdAt.toISOString()
    }));

    const response = {
      id: post.id,
      platform: post.platform,
      text: post.text,
      status: post.status,
      groupId: post.groupId,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      media: mediaItems,
      postResults
    };

    res.json(response);
  } catch (error) {
    logger.error({ error, postId, userId: req.user!.id }, 'Failed to fetch post');
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

export default router;
