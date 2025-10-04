import { Worker } from 'bullmq';
import { QUEUE_NAMES, twitterQueue, connection, QUEUE_CONFIG } from '../queue';
import { getPrisma } from '../prisma';
import { downloadMediaFile } from '../utils/downloadMediaFile';
import { existsSync } from 'fs';
import { logger } from '../logger';

export function startDownloadWorker() {
  const worker = new Worker<{ mediaId: string; groupId?: string }>(QUEUE_NAMES.mediaDownload, async (job) => {
    const { mediaId } = job.data;

    // Update status to working
    await getPrisma().mediaDownloadResult.upsert({
      where: { mediaId },
      update: {
        status: 'working',
        statusText: 'Downloading...',
      },
      create: {
        mediaId,
        status: 'working',
        statusText: 'Downloading...',
      },
    });

    // Get media record from database
    const media = await getPrisma().media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new Error(`Media not found: ${mediaId}`);
    }

    // Check if media already exists and file is present on disk
    if (media.localPath && existsSync(media.localPath)) {
      // Skip download if file already exists
      await getPrisma().mediaDownloadResult.upsert({
        where: { mediaId },
        update: {
          status: 'success',
          statusText: 'File already exists',
        },
        create: {
          mediaId,
          status: 'success',
          statusText: 'File already exists',
        },
      });
      return { success: true, skipped: true };
    }
    
    // Download the media
    const localPath = await downloadMediaFile(media.url, mediaId);
    
    // Update media record with local path
    await getPrisma().media.update({
      where: { id: mediaId },
      data: {
        localPath,
      },
    });

    return { success: true };
  }, {
    connection,
    concurrency: QUEUE_CONFIG.mediaDownload.concurrency,
  });

  worker.on('error', (err) => {
    logger.error({ err, queueName: QUEUE_NAMES.mediaDownload }, 'Download worker error');
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;
    
    const { mediaId } = job.data;
    const errorMessage = err.message || 'Unknown error occurred';
    
    logger.warn({ 
      jobId: job.id, 
      queueName: QUEUE_NAMES.mediaDownload, 
      attemptsMade: job.attemptsMade, 
      maxAttempts: job.opts.attempts,
      error: errorMessage,
      mediaId
    }, 'Download job failed');

    // Mark this specific media as failed
    await getPrisma().mediaDownloadResult.upsert({
      where: { mediaId },
      update: {
        status: 'failed',
        statusText: `Download failed: ${errorMessage}`,
      },
      create: {
        mediaId,
        status: 'failed',
        statusText: `Download failed: ${errorMessage}`,
      },
    });
  });

  worker.on('completed', async (job) => {
    if (!job) return;
    
    const { mediaId, groupId } = job.data;
    
    logger.info({ 
      jobId: job.id, 
      queueName: QUEUE_NAMES.mediaDownload, 
      attemptsMade: job.attemptsMade,
      mediaId
    }, 'Download job completed successfully');

    // Check if the job was skipped (file already exists)
    const existingResult = await getPrisma().mediaDownloadResult.findUnique({
      where: { mediaId },
    });

    // Only update status if it's not already set to "File already exists"
    if (!existingResult || existingResult.statusText !== 'File already exists') {
      // Update status to success
      await getPrisma().mediaDownloadResult.upsert({
        where: { mediaId },
        update: {
          status: 'success',
          statusText: 'Download completed',
        },
        create: {
          mediaId,
          status: 'success',
          statusText: 'Download completed',
        },
      });
    }

    // Check if all media for this group has finished downloading
    if (groupId) {
      const allDownloaded = await checkAllMediaDownloaded(groupId);
      if (allDownloaded) {
        logger.info({ groupId }, 'All media downloaded, enqueueing posting jobs');
        await enqueuePostingJobs(groupId);
      }
    }
  });

  return worker;
}


/**
 * Check if all media for a post group has finished downloading
 */
async function checkAllMediaDownloaded(groupId: string): Promise<boolean> {
  const posts = await getPrisma().post.findMany({
    where: { groupId },
    include: {
      postMedia: {
        include: { media: true },
      },
    },
  });

  for (const post of posts) {
    for (const pm of post.postMedia) {
      const downloadResult = await getPrisma().mediaDownloadResult.findUnique({
        where: { mediaId: pm.media.id },
      });
      
      if (!downloadResult || downloadResult.status !== 'success') {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Enqueue posting jobs for all posts in a group
 */
async function enqueuePostingJobs(groupId: string): Promise<void> {
  const posts = await getPrisma().post.findMany({
    where: { groupId },
  });

  for (const post of posts) {
    if (post.platform === 'twitter') {
      await twitterQueue.add('post:twitter', {
        userId: post.userId,
        postId: post.id,
        text: post.text,
      });
    } else {
      // For non-implemented platforms, create a failed result
      await getPrisma().postResult.create({
        data: {
          postId: post.id,
          status: 'failed',
          statusText: `${post.platform} posting not yet implemented`,
        },
      });
      await getPrisma().post.update({
        where: { id: post.id },
        data: { status: 'failed' },
      });
    }
  }
}