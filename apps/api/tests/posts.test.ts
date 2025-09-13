import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApi } from '../src/api';

const app = createApi();
import { createTweet } from '@squidbox/twitter-api';
import { CreatePostRequest } from '@squidbox/contracts';

// Mock the Twitter API
vi.mock('@squidbox/twitter-api', () => ({
  createTweet: vi.fn(),
}));

const mockCreateTweet = vi.mocked(createTweet);

describe('POST /api/post', () => {
  let authToken: string;

  beforeEach(async () => {
    // Create a test user and get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    authToken = userResponse.body.token;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a post successfully', async () => {
    mockCreateTweet.mockResolvedValue({
      success: true,
      tweetId: '1234567890123456789',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
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
      .post('/api/post')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'success',
      platformResults: [
        {
          platform: 'twitter',
          success: true,
          postId: '1234567890123456789',
        },
      ],
      createdAt: expect.any(String),
    });

    expect(mockCreateTweet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        text: 'Hello from Squidbox! 🐙',
      }),
    );
  });

  it('should create a post with media successfully', async () => {
    mockCreateTweet.mockResolvedValue({
      success: true,
      tweetId: '1234567890123456789',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [
                {
                  type: 'image',
                  url: 'https://example.com/image.jpg',
                  alt: 'Test image',
                  id: 'test-id',
                  uri: 'https://example.com/image.jpg',
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/post')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'success',
      platformResults: [
        {
          platform: 'twitter',
          success: true,
          postId: '1234567890123456789',
        },
      ],
    });
  });

  it('should handle video media', async () => {
    mockCreateTweet.mockResolvedValue({
      success: true,
      tweetId: '1234567890123456789',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [
                {
                  type: 'video',
                  url: 'https://example.com/video.mp4',
                  id: 'test-id',
                  uri: 'https://example.com/video.mp4',
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/post')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'success',
      platformResults: [
        {
          platform: 'twitter',
          success: true,
          postId: '1234567890123456789',
        },
      ],
    });
  });

  it('should handle multiple media items', async () => {
    mockCreateTweet.mockResolvedValue({
      success: true,
      tweetId: '1234567890123456789',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: 'Hello from Squidbox! 🐙',
              media: [
                {
                  type: 'image',
                  url: 'https://example.com/image1.jpg',
                  id: 'test-id-1',
                  uri: 'https://example.com/image1.jpg',
                },
                {
                  type: 'image',
                  url: 'https://example.com/image2.jpg',
                  id: 'test-id-2',
                  uri: 'https://example.com/image2.jpg',
                },
                {
                  type: 'image',
                  url: 'https://example.com/image3.jpg',
                  id: 'test-id-3',
                  uri: 'https://example.com/image3.jpg',
                },
                {
                  type: 'image',
                  url: 'https://example.com/image4.jpg',
                  id: 'test-id-4',
                  uri: 'https://example.com/image4.jpg',
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/post')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'success',
      platformResults: [
        {
          platform: 'twitter',
          success: true,
          postId: '1234567890123456789',
        },
      ],
    });
  });

  it('should handle multiple platforms', async () => {
    mockCreateTweet.mockResolvedValue({
      success: true,
      tweetId: '1234567890123456789',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
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
      .post('/api/post')
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'partial', // One success, one not implemented
      platformResults: expect.arrayContaining([
        {
          platform: 'twitter',
          success: true,
          postId: '1234567890123456789',
        },
        {
          platform: 'bluesky',
          success: false,
          error: 'Bluesky posting not yet implemented',
        },
      ]),
    });
  });

  it('should return 401 without authentication', async () => {
    const postData: CreatePostRequest = {
      platformPosts: [
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
      .post('/api/post')
      .send(postData)
      .expect(401);
  });

  it('should return 400 for invalid request body', async () => {
    const invalidData = {
      platformPosts: [
        {
          platforms: ['twitter'],
          posts: [
            {
              text: '', // Empty text should fail validation
              media: [],
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post('/api/post')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'Invalid request body',
      details: expect.any(Array),
    });
  });
});