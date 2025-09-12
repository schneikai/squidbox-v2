import request from 'supertest';
import { describe, it, expect } from 'vitest';

import { createApi } from '../src/api';

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = createApi();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });
});
