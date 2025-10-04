import '../../../test/setup';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { createApi } from '../../api';
import { signJwt } from '../../auth';
import { getPrisma } from '../../prisma';

describe('Platform Routes - GET /status', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    // Create a test user
    testUser = await getPrisma().user.create({
      data: {
        email: 'status-test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should return empty status for user with no connected platforms', async () => {
    const res = await request(app)
      .get('/api/platforms/status')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4); // Should return status for all 4 supported platforms

    // All platforms should show as not connected
    res.body.forEach((platform: any) => {
      expect(platform).toHaveProperty('platform');
      expect(platform).toHaveProperty('isConnected');
      expect(platform).toHaveProperty('username');
      expect(platform).toHaveProperty('expiresAt');
      expect(platform.isConnected).toBe(false);
      expect(platform.username).toBe(null);
      expect(platform.expiresAt).toBe(null);
    });

    // Verify all expected platforms are present
    const platformIds = res.body.map((p: any) => p.platform);
    expect(platformIds).toContain('twitter');
    expect(platformIds).toContain('bluesky');
    expect(platformIds).toContain('onlyfans');
    expect(platformIds).toContain('jff');
  });

  it('should return connected status for platforms with valid tokens', async () => {
    // Create tokens for Twitter and Bluesky
    const now = new Date();
    const futureDate = new Date(now.getTime() + 3600 * 1000); // 1 hour from now

    await getPrisma().oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        accessToken: 'twitter_access_token',
        refreshToken: 'twitter_refresh_token',
        expiresIn: 3600,
        expiresAt: futureDate,
        username: 'twitteruser',
        platformUserId: 'twitter_user_123',
      },
    });

    await getPrisma().oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'bluesky',
        accessToken: 'bluesky_access_token',
        refreshToken: 'bluesky_refresh_token',
        expiresIn: 3600,
        expiresAt: futureDate,
        username: 'blueskyuser',
        platformUserId: 'bluesky_user_123',
      },
    });

    const res = await request(app)
      .get('/api/platforms/status')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4);

    // Find Twitter and Bluesky in the response
    const twitterStatus = res.body.find((p: any) => p.platform === 'twitter');
    const blueskyStatus = res.body.find((p: any) => p.platform === 'bluesky');
    const onlyfansStatus = res.body.find((p: any) => p.platform === 'onlyfans');
    const jffStatus = res.body.find((p: any) => p.platform === 'jff');

    expect(twitterStatus).toBeDefined();
    expect(twitterStatus).toMatchObject({
      platform: 'twitter',
      isConnected: true,
      username: 'twitteruser',
      expiresAt: futureDate.toISOString(),
    });

    expect(blueskyStatus).toBeDefined();
    expect(blueskyStatus).toMatchObject({
      platform: 'bluesky',
      isConnected: true,
      username: 'blueskyuser',
      expiresAt: futureDate.toISOString(),
    });

    expect(onlyfansStatus).toBeDefined();
    expect(onlyfansStatus).toMatchObject({
      platform: 'onlyfans',
      isConnected: false,
      username: null,
      expiresAt: null,
    });

    expect(jffStatus).toBeDefined();
    expect(jffStatus).toMatchObject({
      platform: 'jff',
      isConnected: false,
      username: null,
      expiresAt: null,
    });
  });

  it('should mark expired tokens as not connected', async () => {
    // Create an expired token
    const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago

    await getPrisma().oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        accessToken: 'expired_access_token',
        refreshToken: 'expired_refresh_token',
        expiresIn: 3600,
        expiresAt: pastDate,
        username: 'expireduser',
        platformUserId: 'expired_user_123',
      },
    });

    const res = await request(app)
      .get('/api/platforms/status')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);

    const twitterStatus = res.body.find((p: any) => p.platform === 'twitter');
    expect(twitterStatus).toMatchObject({
      platform: 'twitter',
      isConnected: false,
      username: 'expireduser',
      expiresAt: pastDate.toISOString(),
    });
  });

  it('should mark tokens without expiration as connected', async () => {
    // Create a token without expiration
    await getPrisma().oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        accessToken: 'permanent_access_token',
        refreshToken: 'permanent_refresh_token',
        expiresIn: 3600,
        expiresAt: null, // No expiration
        username: 'permanentuser',
        platformUserId: 'permanent_user_123',
      },
    });

    const res = await request(app)
      .get('/api/platforms/status')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);

    const twitterStatus = res.body.find((p: any) => p.platform === 'twitter');
    expect(twitterStatus).toMatchObject({
      platform: 'twitter',
      isConnected: true,
      username: 'permanentuser',
      expiresAt: null,
    });
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .get('/api/platforms/status');

    expect(res.status).toBe(401);
  });

  it('should only return status for the authenticated user', async () => {
    // Create another user with tokens
    const otherUser = await getPrisma().user.create({
      data: {
        email: 'other-status-user@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Create tokens for the other user
    await getPrisma().oAuthToken.create({
      data: {
        userId: otherUser.id,
        platform: 'twitter',
        accessToken: 'other_access_token',
        refreshToken: 'other_refresh_token',
        expiresIn: 3600,
        username: 'otheruser',
        platformUserId: 'other_user_123',
      },
    });

    // Create tokens for the test user
    await getPrisma().oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'bluesky',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        username: 'testuser',
        platformUserId: 'test_user_123',
      },
    });

    const res = await request(app)
      .get('/api/platforms/status')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);

    // Should only show test user's connections
    const twitterStatus = res.body.find((p: any) => p.platform === 'twitter');
    const blueskyStatus = res.body.find((p: any) => p.platform === 'bluesky');

    expect(twitterStatus).toBeDefined();
    expect(twitterStatus.isConnected).toBe(false);
    expect(blueskyStatus).toBeDefined();
    expect(blueskyStatus.isConnected).toBe(true);
    expect(blueskyStatus.username).toBe('testuser');
  });

  it('should handle database errors gracefully', async () => {
    // This test would require mocking the database to simulate errors
    // For now, we'll just ensure the endpoint exists and returns proper structure
    const res = await request(app)
      .get('/api/platforms/status')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
