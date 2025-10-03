import '../../test/setup';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApi } from '../api';
import { getPrisma } from '../prisma';
import { authenticateUser, createUser, authHeader } from '../../test/utils';

const app = createApi();

// Mock the queue system
vi.mock('../queue', () => ({
  downloadQueue: {
    add: vi.fn().mockResolvedValue({ id: 'mock-download-job' }),
    getJobs: vi.fn().mockResolvedValue([]),
  },
  twitterQueue: {
    getJobs: vi.fn().mockResolvedValue([]),
  },
  QUEUE_NAMES: {
    download: 'media:download',
  },
}));

describe('POST /api/posts/group/:groupId/retry', () => {
  let authToken: string;
  let userId: string;
  let groupId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await createUser();
    userId = user.id;
    groupId = 'test-group-123';

    const auth = await authenticateUser(user);
    authToken = auth.token;

    // Create test posts in the group
    await getPrisma().post.create({
      data: {
        userId,
        platform: 'twitter',
        text: 'Test tweet',
        status: 'failed',
        groupId,
      },
    });

    await getPrisma().post.create({
      data: {
        userId,
        platform: 'bluesky',
        text: 'Test tweet 2',
        status: 'failed',
        groupId,
      },
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should retry all failed posts in the group', async () => {
    const response = await request(app)
      .post(`/api/posts/group/${groupId}/retry`)
      .set(authHeader(authToken))
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      retriedCount: 2,
      groupId
    });

    // Check that download job was enqueued with retryOnly flag
    const { downloadQueue } = await import('../queue');
    expect(downloadQueue.add).toHaveBeenCalledWith(
      'media:download',
      { groupId, retryOnly: true },
      expect.objectContaining({
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
      })
    );

    // Check that all posts in the group were reset to pending
    const posts = await getPrisma().post.findMany({
      where: { groupId },
    });

    expect(posts).toHaveLength(2);
    expect(posts.every(post => post.status === 'pending')).toBe(true);
  });

  it('should return 404 for non-existent group', async () => {
    await request(app)
      .post(`/api/posts/group/non-existent-group/retry`)
      .set(authHeader(authToken))
      .expect(404);
  });

  it('should return 404 for group not owned by user', async () => {
    // Create another user and post
    const otherUser = await createUser({ email: 'other@example.com' });

    await getPrisma().post.create({
      data: {
        userId: otherUser.id,
        platform: 'twitter',
        text: 'Other user post',
        status: 'failed',
        groupId: 'other-group',
      },
    });

    await request(app)
      .post(`/api/posts/group/other-group/retry`)
      .set(authHeader(authToken))
      .expect(404);
  });

  it('should handle case with no failed posts', async () => {
    // Create a group with only successful posts
    const successGroupId = 'success-group';
    await getPrisma().post.create({
      data: {
        userId,
        platform: 'twitter',
        text: 'Success tweet',
        status: 'success',
        groupId: successGroupId,
      },
    });

    const response = await request(app)
      .post(`/api/posts/group/${successGroupId}/retry`)
      .set(authHeader(authToken))
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      message: 'No failed posts to retry',
      retriedCount: 0
    });
  });

  it('should cancel existing jobs to prevent race conditions', async () => {
    const { downloadQueue, twitterQueue } = await import('../queue');

    // Mock existing jobs
    const mockDownloadJob = {
      data: { groupId },
      remove: vi.fn().mockResolvedValue(undefined),
    } as any;
    const mockPostingJob = {
      data: { postId: 'post-1' },
      remove: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Mock getJobs to return existing jobs
    vi.spyOn(downloadQueue, 'getJobs').mockResolvedValue([mockDownloadJob]);
    vi.spyOn(twitterQueue, 'getJobs').mockResolvedValue([mockPostingJob]);

    const response = await request(app)
      .post(`/api/posts/group/${groupId}/retry`)
      .set(authHeader(authToken))
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      retriedCount: 2,
      groupId
    });

    // Verify existing jobs were cancelled
    expect(mockDownloadJob.remove).toHaveBeenCalled();
    expect(mockPostingJob.remove).toHaveBeenCalled();

    // Verify new job was enqueued
    expect(downloadQueue.add).toHaveBeenCalledWith(
      'media:download',
      { groupId, retryOnly: true },
      expect.objectContaining({
        attempts: 2,
        backoff: { type: 'fixed', delay: 1000 },
      })
    );
  });
});
