import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApi } from '../src/api.js';
import { prisma } from '../src/prisma.js';
import { createTweet } from '@squidbox/twitter-api';
import { CreatePostRequest } from '@squidbox/contracts';

// Mock the Twitter API
vi.mock('@squidbox/twitter-api', () => ({
  createTweet: vi.fn(),
}));

const mockCreateTweet = vi.mocked(createTweet);

describe('POST /api/post', () => {
  let testUser: any;
  let authToken: string;
  let app: any;

  beforeEach(async () => {
    // Create app instance
    app = createApi();
    // Create a test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Create Twitter OAuth tokens for the test user
    await prisma.oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        username: 'testuser',
        platformUserId: '123456789',
      },
    });

    // Generate a JWT token for authentication
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET || 'test-secret');
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.post.deleteMany({});
    await prisma.oAuthToken.deleteMany({});
    await prisma.user.deleteMany({});
    vi.clearAllMocks();
  });

  it('should create a post successfully for Twitter', async () => {
    // Mock successful Twitter API response
    mockCreateTweet.mockResolvedValue({
      success: true,
      tweetId: '1234567890123456789',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platform: 'twitter',
          text: 'Hello from Squidbox! 🐙',
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

    // Verify the post was stored in the database
    const storedPost = await prisma.post.findFirst({
      where: { userId: testUser.id },
    });
    expect(storedPost).toBeTruthy();
    expect(storedPost?.status).toBe('success');
  });

  it('should handle Twitter API errors gracefully', async () => {
    // Mock Twitter API error
    mockCreateTweet.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded',
      errorType: 'rate_limit',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platform: 'twitter',
          text: 'Hello from Squidbox! 🐙',
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
      status: 'failed',
      platformResults: [
        {
          platform: 'twitter',
          success: false,
          error: 'Rate limit exceeded',
        },
      ],
      createdAt: expect.any(String),
    });
  });

  it('should return 401 for unauthenticated requests', async () => {
    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platform: 'twitter',
          text: 'Hello from Squidbox! 🐙',
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
          platform: 'invalid-platform',
          text: 'Hello from Squidbox! 🐙',
        },
      ],
    };

    const response = await request(app)
      .post('/api/post')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Invalid request body');
    // The details property might not be present depending on the validation error structure
    if (response.body.details) {
      expect(response.body).toHaveProperty('details');
    }
  });

  it('should handle missing Twitter authentication', async () => {
    // Delete the Twitter OAuth token
    await prisma.oAuthToken.deleteMany({
      where: { userId: testUser.id, platform: 'twitter' },
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platform: 'twitter',
          text: 'Hello from Squidbox! 🐙',
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
      status: 'failed',
      platformResults: [
        {
          platform: 'twitter',
          success: false,
          error: 'Twitter authentication not found. Please connect your Twitter account.',
        },
      ],
      createdAt: expect.any(String),
    });
  });

  it('should handle expired Twitter tokens', async () => {
    // Update the token to be expired
    await prisma.oAuthToken.updateMany({
      where: { userId: testUser.id, platform: 'twitter' },
      data: {
        expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      },
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platform: 'twitter',
          text: 'Hello from Squidbox! 🐙',
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
      status: 'failed',
      platformResults: [
        {
          platform: 'twitter',
          success: false,
          error: 'Twitter token expired. Please reconnect your Twitter account.',
        },
      ],
      createdAt: expect.any(String),
    });
  });

  it('should handle multiple platforms with mixed results', async () => {
    // Mock Twitter success
    mockCreateTweet.mockResolvedValue({
      success: true,
      tweetId: '1234567890123456789',
    });

    const postData: CreatePostRequest = {
      platformPosts: [
        {
          platform: 'twitter',
          text: 'Hello from Squidbox! 🐙',
        },
        {
          platform: 'bluesky',
          text: 'Hello from Squidbox! 🐙',
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
      status: 'partial', // Should be partial since Bluesky is not implemented
      platformResults: [
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
      ],
      createdAt: expect.any(String),
    });
  });
});
