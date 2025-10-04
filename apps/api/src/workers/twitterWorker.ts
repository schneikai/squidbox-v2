import { Worker } from 'bullmq';
import { QUEUE_NAMES, connection, QUEUE_CONFIG } from '../queue';
import { getPrisma } from '../prisma';
import { postToPlatform } from '../services/platformService';
import { logger } from '../logger';

export function startTwitterWorker() {
  const worker = new Worker<{ userId: string; postId: string; text: string }>(QUEUE_NAMES.postTwitter, async (job) => {
    const { userId, postId, text } = job.data;

    const postWithMedia = await getPrisma().post.findUnique({
      where: { id: postId },
      include: {
        postMedia: {
          include: { media: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    const media = (postWithMedia?.postMedia ?? []).map((pm) => ({
      type: pm.media.type,
      url: pm.media.url,
      id: pm.media.id,
      uri: pm.media.url,
      localPath: pm.media.localPath ?? undefined,
    }));

    const result = await postToPlatform(userId, {
      platform: 'twitter',
      post: { text, media },
    });

    return result;
  }, {
    connection,
    concurrency: QUEUE_CONFIG.postTwitter.concurrency,
  });

  worker.on('error', (err) => {
    logger.error({ err, queueName: QUEUE_NAMES.postTwitter }, 'Twitter worker error');
  });

  worker.on('failed', async (job, err) => {
    if (!job) return;
    
    const { postId } = job.data;
    const errorMessage = err.message || 'Unknown error occurred';
    
    logger.warn({ 
      jobId: job.id, 
      queueName: QUEUE_NAMES.postTwitter, 
      attemptsMade: job.attemptsMade, 
      maxAttempts: job.opts.attempts,
      error: errorMessage 
    }, 'Twitter job failed');

    // Update database for final failure
    await getPrisma().postResult.upsert({
      where: { postId },
      update: {
        status: 'failed',
        statusText: `Failed after ${job.attemptsMade} attempts: ${errorMessage}`,
      },
      create: {
        postId,
        status: 'failed',
        statusText: `Failed after ${job.attemptsMade} attempts: ${errorMessage}`,
      },
    });

    await getPrisma().post.update({
      where: { id: postId },
      data: { status: 'failed' },
    });
  });

  worker.on('completed', async (job) => {
    if (!job) return;
    
    const { postId } = job.data;
    
    logger.info({ 
      jobId: job.id, 
      queueName: QUEUE_NAMES.postTwitter, 
      attemptsMade: job.attemptsMade 
    }, 'Twitter job completed successfully');

    // Update database for success
    await getPrisma().postResult.upsert({
      where: { postId },
      update: {
        status: 'success',
        statusText: 'Posted successfully',
        platformPostId: job.returnvalue?.platformPostId,
      },
      create: {
        postId,
        status: 'success',
        statusText: 'Posted successfully',
        platformPostId: job.returnvalue?.platformPostId,
      },
    });

    await getPrisma().post.update({
      where: { id: postId },
      data: { status: 'success' },
    });
  });

  return worker;
}
