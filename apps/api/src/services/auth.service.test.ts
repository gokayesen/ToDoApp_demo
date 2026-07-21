import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { findRefreshTokenByHash } from '../repositories/refresh-token.repository.js';
import { hashRefreshToken } from '../lib/refresh-token.js';
import { cleanupUser } from '../test-support/fixtures.js';
import { login, refresh, register } from './auth.service.js';

describe('auth.service', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) await cleanupUser(userId);
  });

  it('registers a new user and rejects a duplicate email with 409', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const session = await register({ email, name: 'Test User', password: 'Password123!' });
    userIds.push(session.user.id);

    expect(session.user.email).toBe(email);
    expect(session.accessToken).toBeTruthy();

    await expect(
      register({ email, name: 'Someone Else', password: 'Password123!' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects login with the wrong password and accepts the right one', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const registered = await register({ email, name: 'Test User', password: 'Password123!' });
    userIds.push(registered.user.id);

    await expect(login({ email, password: 'wrong-password' })).rejects.toMatchObject({ status: 401 });

    const session = await login({ email, password: 'Password123!' });
    expect(session.user.id).toBe(registered.user.id);
  });

  it('rotates the refresh token on use and revokes the old one', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const registered = await register({ email, name: 'Test User', password: 'Password123!' });
    userIds.push(registered.user.id);

    const rotated = await refresh(registered.rawRefreshToken);
    expect(rotated.rawRefreshToken).not.toBe(registered.rawRefreshToken);

    const oldStored = await findRefreshTokenByHash(hashRefreshToken(registered.rawRefreshToken));
    expect(oldStored?.revokedAt).not.toBeNull();
  });

  it('detects refresh-token reuse and revokes the whole token family', async () => {
    const email = `test-${randomUUID()}@example.com`;
    const registered = await register({ email, name: 'Test User', password: 'Password123!' });
    userIds.push(registered.user.id);

    const rotated = await refresh(registered.rawRefreshToken);

    // Replaying the already-rotated-away original token is the theft signal.
    await expect(refresh(registered.rawRefreshToken)).rejects.toMatchObject({ status: 401 });

    // The legitimately-rotated token must be revoked too — the whole family dies.
    await expect(refresh(rotated.rawRefreshToken)).rejects.toMatchObject({ status: 401 });
  });
});
