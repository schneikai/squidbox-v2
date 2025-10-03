import '../../test/setup';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

import { createApi } from '../api';
import { authenticateUser, createUser, authHeader } from '../../test/utils';

describe('Users Routes - GET /me', () => {
  let app: any;
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    app = createApi();

    testUser = await createUser({ email: 'shared-test@example.com' });
    const auth = await authenticateUser(testUser);
    validToken = auth.token;
  });

  it('should return user data with valid authorization', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set(authHeader(validToken));

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
    const { signJwt } = await import('../auth');
    const nonExistentUserId = 'non-existent-user-id';
    const tokenForNonExistentUser = signJwt({ userId: nonExistentUserId });

    const res = await request(app)
      .get('/api/users/me')
      .set(authHeader(tokenForNonExistentUser));

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: 'User not found',
    });
  });
});
