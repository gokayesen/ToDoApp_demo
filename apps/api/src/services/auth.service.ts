import type { User } from '@prisma/client';
import type { LoginRequest, RegisterRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { signAccessToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  generateRawRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from '../lib/refresh-token.js';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeRefreshTokenFamily,
} from '../repositories/refresh-token.repository.js';
import { createUser, findUserByEmail, findUserById } from '../repositories/user.repository.js';

export interface Session {
  user: User;
  accessToken: string;
  rawRefreshToken: string;
}

async function issueSession(user: User, familyId?: string): Promise<Session> {
  const rawRefreshToken = generateRawRefreshToken();
  await createRefreshToken({
    userId: user.id,
    tokenHash: hashRefreshToken(rawRefreshToken),
    familyId,
    expiresAt: refreshTokenExpiry(),
  });

  return { user, accessToken: signAccessToken(user.id), rawRefreshToken };
}

export async function register(input: RegisterRequest): Promise<Session> {
  const existing = await findUserByEmail(input.email);
  if (existing) throw new HttpError(409, 'Email already registered');

  const user = await createUser({
    email: input.email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
  });

  return issueSession(user);
}

export async function login(input: LoginRequest): Promise<Session> {
  const user = await findUserByEmail(input.email);
  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return issueSession(user);
}

export async function refresh(rawRefreshToken: string | undefined): Promise<Session> {
  if (!rawRefreshToken) throw new HttpError(401, 'Missing refresh token');

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const stored = await findRefreshTokenByHash(tokenHash);
  if (!stored) throw new HttpError(401, 'Invalid refresh token');

  if (stored.revokedAt) {
    // Presented token was already rotated away — this is a reuse/theft signal.
    await revokeRefreshTokenFamily(stored.familyId);
    throw new HttpError(401, 'Refresh token reuse detected, please log in again');
  }

  if (stored.expiresAt < new Date()) throw new HttpError(401, 'Refresh token expired');

  const user = await findUserById(stored.userId);
  if (!user) throw new HttpError(401, 'Invalid refresh token');

  await revokeRefreshToken(stored.id);
  return issueSession(user, stored.familyId);
}
