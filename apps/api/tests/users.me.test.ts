import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

import { PrismaClient } from '../generated/prisma';
import { createApi } from '../src/api';
import { signJwt } from '../src/auth';

const prisma = new PrismaClient();

describe('Users Routes - GET /me', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    // Create a test user (using same email as tokens test to verify global cleanup works)
    testUser = await prisma.user.create({
      data: {
        email: 'shared-test@example.com',
        passwordHash: 'hashedpassword',
      },
    });

    // Generate a valid JWT token for the test user
    validToken = signJwt({ userId: testUser.id });
  });

  it('should return user data with valid authorization', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user: {
        id: testUser.id,
        email: testUser.email,
      },
    });
  });

  it('should return 401 when authorization header is missing', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'Missing Authorization header',
    });
  });

  it('should return 401 when authorization header is malformed', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', 'InvalidFormat');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'Invalid token',
    });
  });

  it('should return 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'Invalid token',
    });
  });

  it('should return 401 when user does not exist', async () => {
    // Create a token for a non-existent user
    const nonExistentUserId = 'non-existent-user-id';
    const tokenForNonExistentUser = signJwt({ userId: nonExistentUserId });

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tokenForNonExistentUser}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'User not found',
    });
  });
});
