import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

import { PrismaClient } from '../generated/prisma';
import { createApi } from '../src/api';
import { signJwt } from '../src/auth';

const prisma = new PrismaClient();

describe('Users Routes - GET /tokens/:platform', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    // Create a test user
    testUser = await prisma.user.create({
      data: {
        email: 'test-get@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should retrieve OAuth tokens for a platform', async () => {
    // First, store some tokens
    const tokenData = {
      platform: 'twitter',
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      expiresIn: 3600,
      username: 'testuser',
      userId: 'platform_user_123',
    };

    await prisma.oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: tokenData.platform,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: tokenData.expiresIn,
        expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
        username: tokenData.username,
        platformUserId: tokenData.userId,
      },
    });

    // Now retrieve the tokens
    const res = await request(app)
      .get('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        platform: 'twitter',
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresIn: 3600,
        username: 'testuser',
        userId: 'platform_user_123',
      },
    });
  });

  it('should return null when no tokens exist for platform', async () => {
    const res = await request(app)
      .get('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: null,
    });
  });

  it('should return 401 when authorization header is missing', async () => {
    const res = await request(app).get('/api/users/tokens/twitter');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Missing Authorization header');
  });

  it('should return 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/users/tokens/twitter')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid token');
  });

  it('should return 401 when user does not exist', async () => {
    const invalidToken = signJwt({ userId: 'non-existent-user-id' });
    
    const res = await request(app)
      .get('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'User not found');
  });

  it('should work for different platforms', async () => {
    // Store tokens for different platforms
    const platforms = ['twitter', 'bluesky', 'onlyfans', 'jff'];
    
    for (const platform of platforms) {
      await prisma.oAuthToken.create({
        data: {
          userId: testUser.id,
          platform,
          accessToken: `${platform}_access_token`,
          refreshToken: `${platform}_refresh_token`,
          expiresIn: 3600,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          username: `${platform}user`,
          platformUserId: `${platform}_user_123`,
        },
      });
    }

    // Test each platform
    for (const platform of platforms) {
      const res = await request(app)
        .get(`/api/users/tokens/${platform}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          platform,
          accessToken: `${platform}_access_token`,
          refreshToken: `${platform}_refresh_token`,
          expiresIn: 3600,
          username: `${platform}user`,
          userId: `${platform}_user_123`,
        },
      });
    }
  });
});
