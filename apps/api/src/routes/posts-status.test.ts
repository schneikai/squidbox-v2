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
    getJob: vi.fn(),
  },
  twitterQueue: {
    getJob: vi.fn(),
  },
  queues: new Map([
    ['mediaDownload', { getJob: vi.fn() }],
    ['postTwitter', { getJob: vi.fn() }],
  ]),
}));


describe('GET /api/posts/group/:groupId/status', () => {
  let authToken: string;
  let userId: string;
  let groupId: string;

  beforeEach(async () => {
    // Create a test user
    const user = await createUser({ email: 'test@example.com' });
    userId = user.id;
    groupId = 'test-group-123';

    // Create a test post
    await getPrisma().post.create({
      data: {
        userId,
        platform: 'twitter',
        text: 'Test tweet',
        status: 'pending',
        groupId,
      },
    });

    // Generate a JWT for the created user
    const auth = await authenticateUser(user);
    authToken = auth.token;
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should return 404 for non-existent group', async () => {
    await request(app)
      .get(`/api/posts/group/non-existent-group/status`)
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
        status: 'pending',
        groupId: 'other-group',
      },
    });

    await request(app)
      .get(`/api/posts/group/other-group/status`)
      .set(authHeader(authToken))
      .expect(404);
  });

  it('should return JSON response with group status', async () => {
    const response = await request(app)
      .get(`/api/posts/group/${groupId}/status`)
      .set(authHeader(authToken))
      .expect(200);

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toMatchObject({
      groupId,
      status: expect.any(String),
      posts: expect.any(Array),
    });
  });

  it('should return detailed post status information', async () => {
    const response = await request(app)
      .get(`/api/posts/group/${groupId}/status`)
      .set(authHeader(authToken))
      .expect(200);

    expect(response.body).toMatchObject({
      groupId,
      status: expect.stringMatching(/^(pending|working|success|failed)$/),
      posts: expect.arrayContaining([
        expect.objectContaining({
          postId: expect.any(String),
          platform: expect.any(String),
          text: expect.any(String),
          status: expect.stringMatching(/^(pending|success|failed)$/),
          downloadStatus: expect.stringMatching(/^(pending|working|completed|failed)$/),
          downloadProgress: expect.any(String),
          downloadError: expect.any(String),
          postStatus: expect.stringMatching(/^(pending|working|success|failed)$/),
          postStatusText: expect.any(String),
          platformPostId: expect.any(String),
        }),
      ]),
    });
  });
});
