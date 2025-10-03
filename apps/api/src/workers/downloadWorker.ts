import { createWorker, QUEUE_NAMES, twitterQueue } from '../queue';
import { getPrisma } from '../prisma';
import { downloadMedia } from '../utils/downloadMedia';
import { existsSync } from 'fs';

export function startDownloadWorker() {
  return createWorker<{ groupId: string; retryOnly?: boolean }>(QUEUE_NAMES.download, async (job) => {
    const { groupId, retryOnly = false } = job.data;
    await job.updateProgress({ phase: 'starting', groupId, retryOnly });

    // Get all posts in this group
    const posts = await getPrisma().post.findMany({
      where: { 
        groupId,
        ...(retryOnly ? { status: 'failed' } : {})
      },
      include: {
        postMedia: {
          include: { media: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    let totalMedia = 0;
    let completedMedia = 0;

    // Count total media across all posts
    for (const post of posts) {
      totalMedia += post.postMedia.length;
    }

    await job.updateProgress({ phase: 'downloading', groupId, completed: 0, total: totalMedia, percent: 0 });

    // Download media for all posts in the group
    for (const post of posts) {
      for (const pm of post.postMedia) {
        await job.updateProgress({ 
          phase: 'downloading', 
          groupId, 
          postId: post.id,
          mediaId: pm.media.id, 
          completed: completedMedia, 
          total: totalMedia, 
          percent: totalMedia ? Math.round((completedMedia / totalMedia) * 100) : 0 
        });
        
        // Check if media already exists and file is present on disk
        if (pm.media.localPath && existsSync(pm.media.localPath)) {
          // Skip download if file already exists
          await job.updateProgress({ 
            phase: 'downloading', 
            groupId, 
            postId: post.id,
            mediaId: pm.media.id, 
            completed: completedMedia + 1, 
            total: totalMedia, 
            percent: totalMedia ? Math.round(((completedMedia + 1) / totalMedia) * 100) : 100 
          });
          completedMedia++;
          continue;
        }
        
        await downloadMedia(pm.media.id, pm.media.url);
        completedMedia++;
        
        await job.updateProgress({ 
          phase: 'downloading', 
          groupId, 
          postId: post.id,
          mediaId: pm.media.id, 
          completed: completedMedia, 
          total: totalMedia, 
          percent: totalMedia ? Math.round((completedMedia / totalMedia) * 100) : 100 
        });
      }
    }

    await job.updateProgress({ phase: 'finished', groupId, completed: completedMedia, total: totalMedia, percent: 100 });

    // Enqueue posting jobs for each post in the group
    for (const post of posts) {
      if (post.platform === 'twitter') {
        await twitterQueue.add('post:twitter', {
          userId: post.userId,
          postId: post.id,
          text: post.text,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
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

    return { ok: true, postsProcessed: posts.length };
  });
}
