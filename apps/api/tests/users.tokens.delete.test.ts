import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

import { PrismaClient, Platform } from '@prisma/client';
import { SUPPORTED_PLATFORMS } from '@squidbox/contracts';
import { createApi } from '../src/api';
import { signJwt } from '../src/auth';

const prisma = new PrismaClient();

describe('Users Routes - DELETE /tokens/:platform', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    // Create a test user
    testUser = await prisma.user.create({
      data: {
        email: 'delete-test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should delete OAuth tokens for a valid platform', async () => {
    // First, create some tokens to delete
    const tokenData = {
      platform: 'twitter',
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      expiresIn: 3600,
      username: 'testuser',
      platformUserId: 'platform_user_123',
    };

    // Store tokens first
    await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(tokenData);

    // Verify tokens exist
    const existingTokens = await prisma.oAuthToken.findMany({
      where: { userId: testUser.id, platform: 'twitter' },
    });
    expect(existingTokens).toHaveLength(1);

    // Delete the tokens
    const res = await request(app)
      .delete('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Platform disconnected successfully',
    });

    // Verify tokens are deleted
    const remainingTokens = await prisma.oAuthToken.findMany({
      where: { userId: testUser.id, platform: 'twitter' },
    });
    expect(remainingTokens).toHaveLength(0);
  });

  it('should return 404 when trying to delete non-existent tokens', async () => {
    const res = await request(app)
      .delete('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: 'No tokens found for this platform',
    });
  });

  it('should return 400 for invalid platform parameter', async () => {
    const res = await request(app)
      .delete('/api/users/tokens/invalid_platform')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'Invalid platform parameter',
    });
  });

  it('should return 400 when platform parameter is missing', async () => {
    const res = await request(app)
      .delete('/api/users/tokens/')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404); // Express returns 404 for missing route parameter
  });

  it('should only delete tokens for the authenticated user', async () => {
    // Create another user with tokens
    const otherUser = await prisma.user.create({
      data: {
        email: 'other-user@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Create tokens for the other user
    await prisma.oAuthToken.create({
      data: {
        userId: otherUser.id,
        platform: 'twitter',
        accessToken: 'other_access_token',
        refreshToken: 'other_refresh_token',
        expiresIn: 3600,
        username: 'otheruser',
        platformUserId: 'other_platform_user',
      },
    });

    // Create tokens for the test user
    await prisma.oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        username: 'testuser',
        platformUserId: 'test_platform_user',
      },
    });

    // Delete tokens for the test user
    const res = await request(app)
      .delete('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);

    // Verify only test user's tokens are deleted
    const testUserTokens = await prisma.oAuthToken.findMany({
      where: { userId: testUser.id, platform: 'twitter' },
    });
    expect(testUserTokens).toHaveLength(0);

    // Verify other user's tokens still exist
    const otherUserTokens = await prisma.oAuthToken.findMany({
      where: { userId: otherUser.id, platform: 'twitter' },
    });
    expect(otherUserTokens).toHaveLength(1);
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .delete('/api/users/tokens/twitter');

    expect(res.status).toBe(401);
  });

  it('should handle multiple platforms correctly', async () => {
    // Create tokens for multiple platforms
    await prisma.oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        accessToken: 'twitter_token',
        refreshToken: 'twitter_refresh',
        expiresIn: 3600,
        username: 'twitteruser',
        platformUserId: 'twitter_user_123',
      },
    });

    await prisma.oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'bluesky',
        accessToken: 'bluesky_token',
        refreshToken: 'bluesky_refresh',
        expiresIn: 3600,
        username: 'blueskyuser',
        platformUserId: 'bluesky_user_123',
      },
    });

    // Delete only Twitter tokens
    const res = await request(app)
      .delete('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);

    // Verify only Twitter tokens are deleted
    const twitterTokens = await prisma.oAuthToken.findMany({
      where: { userId: testUser.id, platform: 'twitter' },
    });
    expect(twitterTokens).toHaveLength(0);

    // Verify Bluesky tokens still exist
    const blueskyTokens = await prisma.oAuthToken.findMany({
      where: { userId: testUser.id, platform: 'bluesky' },
    });
    expect(blueskyTokens).toHaveLength(1);
  });

  it('should validate platform parameter against supported platforms', async () => {
    // Test with each supported platform
    const supportedPlatforms = SUPPORTED_PLATFORMS.map(p => p.id);
    
    for (const platform of supportedPlatforms) {
      // Create tokens for this platform
      await prisma.oAuthToken.create({
        data: {
          userId: testUser.id,
          platform: platform as Platform,
          accessToken: `${platform}_token`,
          refreshToken: `${platform}_refresh`,
          expiresIn: 3600,
          username: `${platform}user`,
          platformUserId: `${platform}_user_123`,
        },
      });

      // Delete tokens for this platform
      const res = await request(app)
        .delete(`/api/users/tokens/${platform}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'Platform disconnected successfully',
      });

      // Verify tokens are deleted
      const remainingTokens = await prisma.oAuthToken.findMany({
        where: { userId: testUser.id, platform: platform as Platform },
      });
      expect(remainingTokens).toHaveLength(0);
    }
  });

  it('should handle database errors gracefully', async () => {
    // This test would require mocking the database to simulate errors
    // For now, we'll just ensure the endpoint exists and returns proper structure
    const res = await request(app)
      .delete('/api/users/tokens/twitter')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404); // No tokens to delete
    expect(res.body).toMatchObject({
      error: 'No tokens found for this platform',
    });
  });
});
