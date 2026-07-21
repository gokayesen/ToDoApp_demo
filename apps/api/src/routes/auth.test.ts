import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { cleanupUser } from '../test-support/fixtures.js';

describe('auth routes', () => {
  const app = createApp();
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) await cleanupUser(userId);
  });

  it('registers, rejects wrong-password login, then accepts the right one', async () => {
    const email = `test-${randomUUID()}@example.com`;

    const registerRes = await request(app)
      .post('/auth/register')
      .send({ email, name: 'Route Test User', password: 'Password123!' });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.accessToken).toBeTruthy();
    userIds.push(registerRes.body.user.id);

    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email, password: 'nope' });
    expect(wrongPassword.status).toBe(401);

    const correct = await request(app)
      .post('/auth/login')
      .send({ email, password: 'Password123!' });
    expect(correct.status).toBe(200);
  });

  it('rejects a duplicate registration with 409', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const first = await request(app)
      .post('/auth/register')
      .send({ email, name: 'First', password: 'Password123!' });
    userIds.push(first.body.user.id);

    const second = await request(app)
      .post('/auth/register')
      .send({ email, name: 'Second', password: 'Password123!' });
    expect(second.status).toBe(409);
  });

  it('rotates the refresh cookie across a full register -> refresh round trip', async () => {
    const email = `test-${randomUUID()}@example.com`;

    const registerRes = await request(app)
      .post('/auth/register')
      .send({ email, name: 'Agent User', password: 'Password123!' });
    userIds.push(registerRes.body.user.id);

    // Forward the Set-Cookie header explicitly rather than via an
    // agent/cookie-jar — the refresh cookie is Secure (Architecture §7.1,
    // cross-origin prod deploy), and superagent's cookie jar correctly
    // refuses to replay a Secure cookie over this test server's plain HTTP.
    const setCookie = registerRes.headers['set-cookie'] as unknown as string[];
    const refreshRes = await request(app).post('/auth/refresh').set('Cookie', setCookie);
    expect(refreshRes.status).toBe(200);
    // The rotated refresh cookie must differ — JWT access tokens issued
    // within the same second for the same user are legitimately identical
    // (stateless, no jti), so that's not the right thing to assert here.
    const rotatedCookie = refreshRes.headers['set-cookie'] as unknown as string[];
    expect(rotatedCookie[0]).not.toBe(setCookie[0]);
  });
});
