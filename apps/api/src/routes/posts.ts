import { Router } from 'express';
import { CreatePostRequest, CreatePostResponse, PostResult, PlatformPost, GroupStatusResponse, RetryResponse } from '@squidbox/contracts';
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

  const response: GroupStatusResponse = {
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

  const response: RetryResponse = { 
    ok: true, 
    retriedCount: failedPosts.length,
    groupId: groupId || ''
  };
  res.json(response);
});

export default router;
