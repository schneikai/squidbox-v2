import '../../test/setup';
import { describe, it, expect, beforeEach } from 'vitest';
import { getPrisma } from '../prisma';
import { createPostMediaEntries } from './createPostMediaEntries';

describe('createPostMediaEntries', () => {
  let postId: string;

  beforeEach(async () => {
    const user = await getPrisma().user.create({
      data: { email: `u_${Date.now()}@example.com`, passwordHash: 'hash' },
    });
    const post = await getPrisma().post.create({
      data: {
        userId: user.id,
        platform: 'twitter',
        text: 'hello',
        status: 'pending',
        groupId: 'g1',
      },
    });
    postId = post.id;
  });

  it('creates media and postMedia links in order', async () => {
    const mediaItems = [
      { type: 'image', url: 'https://example.com/a.jpg' },
      { type: 'video', url: 'https://example.com/b.mp4' },
    ];

    const result = await createPostMediaEntries(postId, mediaItems as any);
    expect(result).toHaveLength(2);

    const links = await getPrisma().postMedia.findMany({ where: { postId }, orderBy: { order: 'asc' } });
    expect(links).toHaveLength(2);
    expect(links[0].order).toBe(0);
    expect(links[1].order).toBe(1);

    const media = await getPrisma().media.findMany({ where: { url: { in: mediaItems.map(m => m.url) } } });
    expect(media).toHaveLength(2);
  });

  it('re-uses existing media for same URL', async () => {
    const first = await createPostMediaEntries(postId, [
      { type: 'image', url: 'https://example.com/c.jpg' },
    ] as any);
    const mediaId = first[0].media.id;

    // Call again with same URL
    const second = await createPostMediaEntries(postId, [
      { type: 'image', url: 'https://example.com/c.jpg' },
    ] as any);

    expect(second[0].media.id).toBe(mediaId);
  });
});


