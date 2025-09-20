import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

import { PrismaClient, Platform } from '@prisma/client';
import { SUPPORTED_PLATFORMS } from '@squidbox/contracts';
import { createApi } from '../src/api';
import { signJwt } from '../src/auth';

const prisma = new PrismaClient();

describe('Users Routes - POST /tokens', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  const validTokenData = {
    platform: 'twitter',
    accessToken: 'access_token_123',
    refreshToken: 'refresh_token_123',
    expiresIn: 3600,
    username: 'testuser',
    platformUserId: 'platform_user_123',
  };

  beforeEach(async () => {
    app = createApi();

    // Create a test user (using same email as me test to verify global cleanup works)
    testUser = await prisma.user.create({
      data: {
        email: 'shared-test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should store OAuth tokens with valid data', async () => {
    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validTokenData);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Tokens stored successfully',
    });

    // Verify the token was stored in the database
    const storedToken = await prisma.oAuthToken.findUnique({
      where: {
        userId_platform: {
          userId: testUser.id,
          platform: 'twitter',
        },
      },
    });

    expect(storedToken).toBeTruthy();
    expect(storedToken?.accessToken).toBe(validTokenData.accessToken);
    expect(storedToken?.refreshToken).toBe(validTokenData.refreshToken);
    expect(storedToken?.expiresIn).toBe(validTokenData.expiresIn);
    expect(storedToken?.username).toBe(validTokenData.username);
    expect(storedToken?.platformUserId).toBe(validTokenData.platformUserId);
  });

  it('should update existing OAuth tokens when upserting', async () => {
    // First, create an existing token
    await prisma.oAuthToken.create({
      data: {
        userId: testUser.id,
        platform: 'twitter',
        accessToken: 'old_access_token',
        refreshToken: 'old_refresh_token',
        expiresIn: 1800,
        username: 'oldusername',
        platformUserId: 'old_platform_user_id',
      },
    });

    // Now update it
    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validTokenData);

    expect(res.status).toBe(200);

    // Verify the token was updated
    const updatedToken = await prisma.oAuthToken.findUnique({
      where: {
        userId_platform: {
          userId: testUser.id,
          platform: 'twitter',
        },
      },
    });

    expect(updatedToken?.accessToken).toBe(validTokenData.accessToken);
    expect(updatedToken?.refreshToken).toBe(validTokenData.refreshToken);
    expect(updatedToken?.username).toBe(validTokenData.username);
  });

  it('should work without refreshToken (optional field)', async () => {
    const tokenDataWithoutRefresh = {
      ...validTokenData,
      refreshToken: undefined,
    };

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(tokenDataWithoutRefresh);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Tokens stored successfully',
    });
  });

  it('should return 401 when authorization header is missing', async () => {
    const res = await request(app).post('/api/users/tokens').send(validTokenData);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'Missing Authorization header',
    });
  });

  it('should return 401 when token is invalid', async () => {
    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', 'Bearer invalid-token')
      .send(validTokenData);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'Invalid token',
    });
  });

  it('should return 401 when user does not exist', async () => {
    const nonExistentUserId = 'non-existent-user-id';
    const tokenForNonExistentUser = signJwt({ userId: nonExistentUserId });

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${tokenForNonExistentUser}`)
      .send(validTokenData);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'User not found',
    });
  });

  it('should return 400 for invalid platform', async () => {
    const invalidData = {
      ...validTokenData,
      platform: 'invalid_platform',
    };

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const incompleteData = {
      platform: 'twitter',
      // Missing accessToken, expiresIn, username, userId
    };

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(incompleteData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for empty accessToken', async () => {
    const invalidData = {
      ...validTokenData,
      accessToken: '',
    };

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for invalid expiresIn (not positive integer)', async () => {
    const invalidData = {
      ...validTokenData,
      expiresIn: -1,
    };

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for empty username', async () => {
    const invalidData = {
      ...validTokenData,
      username: '',
    };

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for empty platform userId', async () => {
    const invalidData = {
      ...validTokenData,
      platformUserId: '',
    };

    const res = await request(app)
      .post('/api/users/tokens')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should handle all supported platforms', async () => {
    const platforms = SUPPORTED_PLATFORMS.map(p => p.id);

    for (const platform of platforms) {
      const platformData = {
        ...validTokenData,
        platform,
        username: `testuser_${platform}`,
      };

      const res = await request(app)
        .post('/api/users/tokens')
        .set('Authorization', `Bearer ${validToken}`)
        .send(platformData);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'Tokens stored successfully',
      });
    }
  });
});
