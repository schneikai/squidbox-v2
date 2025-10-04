import '../../test/setup';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApi } from '../api';
import nock from 'nock';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Platform } from '@prisma/client';
import { downloadQueue } from '../queue';

const app = createApi();
import { createTweet } from '@squidbox/twitter-api';
import { CreatePostRequest } from '@squidbox/contracts';
import { getPrisma } from '../prisma';

// Mock the Twitter API
vi.mock('@squidbox/twitter-api', () => ({
  createTweet: vi.fn(),
  uploadMedia: vi.fn().mockResolvedValue('mock-media-id'),
}));

// Mock the queue system
vi.mock('../queue', () => ({
  downloadQueue: {
    add: vi.fn().mockResolvedValue({ id: 'mock-download-job' }),
  },
  twitterQueue: {
    add: vi.fn().mockResolvedValue({ id: 'mock-twitter-job' }),
  },
  QUEUE_NAMES: {
    mediaDownload: 'mediaDownload',
    postTwitter: 'postTwitter',
  },
  queues: new Map([
    ['mediaDownload', { add: vi.fn().mockResolvedValue({ id: 'mock-download-job' }) }],
    ['postTwitter', { add: vi.fn().mockResolvedValue({ id: 'mock-twitter-job' }) }],
  ]),
}));


const mockCreateTweet = vi.mocked(createTweet);

describe('POST /api/posts', () => {
  let authToken: string;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test downloads
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'squidbox-test-'));
    
    // Mock the process.cwd() to use our temp directory
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Setup nock to intercept HTTP requests
    nock('https://example.com')
      .get('/image.jpg')
      .reply(200, 'fake image data')
      .get('/video.mp4')
      .reply(200, 'fake video data')
      .get('/image1.jpg')
      .reply(200, 'fake image1 data')
      .get('/image2.jpg')
      .reply(200, 'fake image2 data')
      .get('/image3.jpg')
      .reply(200, 'fake image3 data')
      .get('/image4.jpg')
      .reply(200, 'fake image4 data');
    // Create a test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);

    authToken = userResponse.body.token;
    
    // Create Twitter OAuth tokens for the test user
    await getPrisma().oAuthToken.create({
      data: {
        userId: userResponse.body.user.id,
        platform: 'twitter',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        username: 'testuser',
        platformUserId: '123456789',
      },
    });
  });

  afterEach(async () => {
    // Clean up nock interceptors
    nock.cleanAll();
    
    // Clean up temp directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
    
    vi.clearAllMocks();
  });

  it('should create a post successfully without media', async () => {
    const postData: CreatePostRequest = {
      postGroups: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'pending', // Now returns pending since jobs are queued
      platformResults: [], // Empty initially since jobs are queued
      groupId: expect.any(String),
      createdAt: expect.any(String),
    });

    // Check that no download job was enqueued (no media)
    expect(downloadQueue.add).not.toHaveBeenCalled();
  });

  it('should create a post with media successfully and enqueue download job', async () => {
    const postData: CreatePostRequest = {
      postGroups: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [
                {
                  type: 'image',
                  url: 'https://example.com/image.jpg',
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      platformResults: [],
      groupId: expect.any(String),
    });

    // Check that download job was enqueued
    expect(downloadQueue.add).toHaveBeenCalledWith(
      'download:media',
      expect.objectContaining({
        groupId: expect.any(String),
        mediaId: expect.any(String),
      }),
    );
  });

  it('should handle video media', async () => {
    mockCreateTweet.mockResolvedValue('1234567890123456789');

    const postData: CreatePostRequest = {
      postGroups: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [
                {
                  type: 'video',
                  url: 'https://example.com/video.mp4',
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      platformResults: [],
      groupId: expect.any(String),
    });
  });

  it('should handle multiple media items', async () => {
    mockCreateTweet.mockResolvedValue('1234567890123456789');

    const postData: CreatePostRequest = {
      postGroups: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [
                {
                  type: 'image',
                  url: 'https://example.com/image1.jpg',
                },
                {
                  type: 'image',
                  url: 'https://example.com/image2.jpg',
                },
                {
                  type: 'image',
                  url: 'https://example.com/image3.jpg',
                },
                {
                  type: 'image',
                  url: 'https://example.com/image4.jpg',
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      platformResults: [],
      groupId: expect.any(String),
    });
  });

  it('should handle multiple platforms without media', async () => {
    const postData: CreatePostRequest = {
      postGroups: [
        {
          platforms: [Platform.twitter, Platform.bluesky],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'pending', // Now returns pending since jobs are queued
      platformResults: [], // Empty initially since jobs are queued
      groupId: expect.any(String),
    });

    // Check that no download job was enqueued (no media)
    expect(downloadQueue.add).not.toHaveBeenCalled();
  });

  it('should return 401 without authentication', async () => {
    const postData: CreatePostRequest = {
      postGroups: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [],
            },
          ],
        },
      ],
    };

    await request(app)
      .post('/api/posts')
      .send(postData)
      .expect(401);
  });

  it('should return 400 for invalid request body', async () => {
    const invalidData = {
      text: '', // Empty text should fail validation
      media: [],
      platforms: ['twitter'],
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'Invalid request body',
      details: expect.any(Array),
    });
  });

  it('should create posts with same groupId', async () => {
    const postData: CreatePostRequest = {
      postGroups: [
        {
          platforms: ['twitter', 'bluesky'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    // Check that both posts were created with the same groupId
    const posts = await getPrisma().post.findMany({
      where: { groupId: response.body.groupId },
      orderBy: { createdAt: 'asc' },
    });

    expect(posts).toHaveLength(2);
    expect(posts[0]?.groupId).toBe(posts[1]?.groupId);
    expect(posts[0]?.platform).toBe('twitter');
    expect(posts[1]?.platform).toBe('bluesky');
  });
});