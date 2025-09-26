import { createWorker, QUEUE_NAMES } from '../queue';
import { prisma } from '../prisma';
import { postToPlatform } from '../services/platformService';

export function startTwitterWorker() {
  return createWorker<{ userId: string; postId: string; text: string }>(QUEUE_NAMES.twitter, async (job) => {
    const { userId, postId, text } = job.data;
    await job.updateProgress({ phase: 'login' });

    const postWithMedia = await prisma.post.findUnique({
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

    await job.updateProgress({ phase: 'upload' });
    const result = await postToPlatform(userId, {
      platform: 'twitter',
      post: { text, media },
    });

    await prisma.postResult.upsert({
      where: { postId },
      update: {
        status: result.success ? 'success' : 'failed',
        statusText: result.error || (result.success ? 'Posted successfully' : 'Posting failed'),
        platformPostId: result.platformPostId,
      },
      create: {
        postId,
        status: result.success ? 'success' : 'failed',
        statusText: result.error || (result.success ? 'Posted successfully' : 'Posting failed'),
        platformPostId: result.platformPostId,
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: { status: result.success ? 'success' : 'failed' },
    });

    await job.updateProgress({ phase: 'post', done: true });
    return result;
  });
}
