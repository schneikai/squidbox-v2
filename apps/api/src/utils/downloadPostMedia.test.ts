import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '../prisma';
import { downloadPostMedia } from './downloadPostMedia';

vi.mock('./downloadMedia', () => ({
  downloadMedia: vi.fn().mockResolvedValue('/tmp/mock-file.jpg'),
}));

describe('downloadPostMedia', () => {
  let postId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: { email: `u_${Date.now()}@example.com`, passwordHash: 'hash' },
    });
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        platform: 'twitter',
        text: 'hello',
        status: 'pending',
        groupId: 'g2',
      },
    });
    postId = post.id;

    const m1 = await prisma.media.create({ data: { type: 'image', url: 'https://ex.com/1.jpg' } });
    const m2 = await prisma.media.create({ data: { type: 'video', url: 'https://ex.com/2.mp4' } });

    await prisma.postMedia.createMany({
      data: [
        { postId, mediaId: m1.id, order: 0 },
        { postId, mediaId: m2.id, order: 1 },
      ],
    });
  });

  it('invokes downloadMedia for all media, in order', async () => {
    const { downloadMedia } = await import('./downloadMedia');
    await downloadPostMedia(postId);
    expect(downloadMedia).toHaveBeenCalledTimes(2);
    expect(downloadMedia).toHaveBeenNthCalledWith(1, expect.any(String), 'https://ex.com/1.jpg');
    expect(downloadMedia).toHaveBeenNthCalledWith(2, expect.any(String), 'https://ex.com/2.mp4');
  });
});


