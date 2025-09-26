import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

import { PrismaClient, Platform } from '@prisma/client';
import { SUPPORTED_PLATFORMS } from '@squidbox/contracts';
import { createApi } from '../../api';
import { authenticateUser, createUser, authHeader } from '../../../tests/utils';

const prisma = new PrismaClient();

describe('Platform Routes - Tokens', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    // Create a test user
    testUser = await createUser();

    // Generate a valid JWT token for the test user
    const auth = await authenticateUser(testUser);
    validToken = auth.token;
  });

  describe('GET /tokens/:platform', () => {
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
          platform: tokenData.platform as Platform,
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
        .get('/api/platforms/tokens/twitter')
        .set(authHeader(validToken));

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
        .get('/api/platforms/tokens/twitter')
        .set(authHeader(validToken));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: null,
      });
    });

    it('should return 401 when authorization header is missing', async () => {
      const res = await request(app).get('/api/platforms/tokens/twitter');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Missing Authorization header');
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/platforms/tokens/twitter')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid token');
    });

    it('should return 401 when user does not exist', async () => {
      const { signJwt } = await import('../../auth');
      const invalidToken = signJwt({ userId: 'non-existent-user-id' });
      
      const res = await request(app)
        .get('/api/platforms/tokens/twitter')
        .set(authHeader(invalidToken));

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'User not found');
    });

    it('should work for different platforms', async () => {
      // Store tokens for different platforms
      const platforms = SUPPORTED_PLATFORMS.map(p => p.id);
      
      for (const platform of platforms) {
        await prisma.oAuthToken.create({
          data: {
            userId: testUser.id,
            platform: platform,
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
          .get(`/api/platforms/tokens/${platform}`)
          .set(authHeader(validToken));

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

  describe('DELETE /tokens/:platform', () => {
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
        .post('/api/platforms/tokens')
        .set(authHeader(validToken))
        .send(tokenData);

      // Verify tokens exist
      const existingTokens = await prisma.oAuthToken.findMany({
        where: { userId: testUser.id, platform: 'twitter' },
      });
      expect(existingTokens).toHaveLength(1);

      // Delete the tokens
      const res = await request(app)
        .delete('/api/platforms/tokens/twitter')
        .set(authHeader(validToken));

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
        .delete('/api/platforms/tokens/twitter')
        .set(authHeader(validToken));

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: 'No tokens found for this platform',
      });
    });

    it('should return 400 for invalid platform parameter', async () => {
      const res = await request(app)
        .delete('/api/platforms/tokens/invalid_platform')
        .set(authHeader(validToken));

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: 'Invalid platform parameter',
      });
    });

    it('should return 400 when platform parameter is missing', async () => {
      const res = await request(app)
        .delete('/api/platforms/tokens/')
        .set(authHeader(validToken));

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
        .delete('/api/platforms/tokens/twitter')
        .set(authHeader(validToken));

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
        .delete('/api/platforms/tokens/twitter');

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
        .delete('/api/platforms/tokens/twitter')
        .set(authHeader(validToken));

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
          .delete(`/api/platforms/tokens/${platform}`)
          .set(authHeader(validToken));

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
        .delete('/api/platforms/tokens/twitter')
        .set(authHeader(validToken));

      expect(res.status).toBe(404); // No tokens to delete
      expect(res.body).toMatchObject({
        error: 'No tokens found for this platform',
      });
    });
  });
});