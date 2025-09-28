import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

import { Platform } from '@prisma/client';
import { SUPPORTED_PLATFORMS } from '@squidbox/contracts';
import { createApi } from '../../api';
import { signJwt } from '../../auth';
import { getPrisma } from '../../prisma';

describe('Platform Routes - POST /credentials', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  const validCredentialsData = {
    platform: 'onlyfans',
    username: 'testuser',
    password: 'testpassword123',
    totpSecret: 'JBSWY3DPEHPK3PXP',
  };

  beforeEach(async () => {
    app = createApi();

    // Create a test user
    testUser = await getPrisma().user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should store platform credentials with valid data', async () => {
    const res = await request(app)
      .post('/api/platforms/credentials')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validCredentialsData);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Credentials stored successfully',
    });

    // Verify the credentials were stored in the database
    const storedCredentials = await getPrisma().platformCredentials.findUnique({
      where: {
        userId_platform: {
          userId: testUser.id,
          platform: 'onlyfans',
        },
      },
    });

    expect(storedCredentials).toBeTruthy();
    expect(storedCredentials?.username).toBe(validCredentialsData.username);
    expect(storedCredentials?.password).not.toBe(validCredentialsData.password); // Should be hashed
    expect(storedCredentials?.totpSecret).toBe(validCredentialsData.totpSecret);
  });

  it('should update existing credentials when upserting', async () => {
    // First, create existing credentials
    await getPrisma().platformCredentials.create({
      data: {
        userId: testUser.id,
        platform: 'onlyfans',
        username: 'oldusername',
        password: 'oldhashedpassword',
        totpSecret: 'oldsecret',
      },
    });

    // Now update them
    const res = await request(app)
      .post('/api/platforms/credentials')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validCredentialsData);

    expect(res.status).toBe(200);

    // Verify the credentials were updated
    const updatedCredentials = await getPrisma().platformCredentials.findUnique({
      where: {
        userId_platform: {
          userId: testUser.id,
          platform: 'onlyfans',
        },
      },
    });

    expect(updatedCredentials?.username).toBe(validCredentialsData.username);
    expect(updatedCredentials?.totpSecret).toBe(validCredentialsData.totpSecret);
  });

  it('should work without totpSecret (optional field)', async () => {
    const credentialsWithoutTotp = {
      ...validCredentialsData,
      totpSecret: undefined,
    };

    const res = await request(app)
      .post('/api/platforms/credentials')
      .set('Authorization', `Bearer ${validToken}`)
      .send(credentialsWithoutTotp);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Credentials stored successfully',
    });
  });

  it('should return 401 when authorization header is missing', async () => {
    const res = await request(app).post('/api/platforms/credentials').send(validCredentialsData);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'Missing Authorization header',
    });
  });

  it('should return 400 for invalid platform', async () => {
    const invalidData = {
      ...validCredentialsData,
      platform: 'invalid_platform',
    };

    const res = await request(app)
      .post('/api/platforms/credentials')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for missing required fields', async () => {
    const incompleteData = {
      platform: 'onlyfans',
      // Missing username and password
    };

    const res = await request(app)
      .post('/api/platforms/credentials')
      .set('Authorization', `Bearer ${validToken}`)
      .send(incompleteData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for empty username', async () => {
    const invalidData = {
      ...validCredentialsData,
      username: '',
    };

    const res = await request(app)
      .post('/api/platforms/credentials')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for empty password', async () => {
    const invalidData = {
      ...validCredentialsData,
      password: '',
    };

    const res = await request(app)
      .post('/api/platforms/credentials')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should handle all supported platforms', async () => {
    const platforms = SUPPORTED_PLATFORMS.map(p => p.id);

    for (const platform of platforms) {
      const platformData = {
        ...validCredentialsData,
        platform,
        username: `testuser_${platform}`,
      };

      const res = await request(app)
        .post('/api/platforms/credentials')
        .set('Authorization', `Bearer ${validToken}`)
        .send(platformData);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'Credentials stored successfully',
      });
    }
  });
});

describe('Platform Routes - GET /credentials/:platform', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    // Create a test user
    testUser = await getPrisma().user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should return stored credentials for a platform', async () => {
    // Create credentials in the database
    const credentialsData = {
      userId: testUser.id,
      platform: 'onlyfans' as Platform,
      username: 'testuser',
      password: 'hashedpassword',
      totpSecret: 'JBSWY3DPEHPK3PXP',
    };

    await getPrisma().platformCredentials.create({ data: credentialsData });

    const res = await request(app)
      .get('/api/platforms/credentials/onlyfans')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        platform: 'onlyfans',
        username: 'testuser',
        hasTotp: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });
  });

  it('should return null when no credentials exist for platform', async () => {
    const res = await request(app)
      .get('/api/platforms/credentials/onlyfans')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: null,
    });
  });

  it('should return 400 for invalid platform', async () => {
    const res = await request(app)
      .get('/api/platforms/credentials/invalid_platform')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid platform parameter');
  });
});

describe('Platform Routes - DELETE /credentials/:platform', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    // Create a test user
    testUser = await getPrisma().user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should delete credentials for a platform', async () => {
    // Create credentials in the database
    const credentialsData = {
      userId: testUser.id,
      platform: 'onlyfans' as Platform,
      username: 'testuser',
      password: 'hashedpassword',
      totpSecret: 'JBSWY3DPEHPK3PXP',
    };

    await getPrisma().platformCredentials.create({ data: credentialsData });

    const res = await request(app)
      .delete('/api/platforms/credentials/onlyfans')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Platform credentials deleted successfully',
    });

    // Verify the credentials were deleted
    const deletedCredentials = await getPrisma().platformCredentials.findUnique({
      where: {
        userId_platform: {
          userId: testUser.id,
          platform: 'onlyfans',
        },
      },
    });

    expect(deletedCredentials).toBeNull();
  });

  it('should return 404 when no credentials exist for platform', async () => {
    const res = await request(app)
      .delete('/api/platforms/credentials/onlyfans')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No credentials found for this platform');
  });

  it('should return 400 for invalid platform', async () => {
    const res = await request(app)
      .delete('/api/platforms/credentials/invalid_platform')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid platform parameter');
  });
});
