import type { User } from '@prisma/client';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@todoapp/shared';

import { sendPasswordResetEmail } from '../lib/email.js';
import { HttpError } from '../lib/http-error.js';
import { signAccessToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  generateRawRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from '../lib/refresh-token.js';
import { generateRawResetToken, hashResetToken, resetTokenExpiry } from '../lib/reset-token.js';
import { createOAuthAccount, findOAuthAccount } from '../repositories/oauth-account.repository.js';
import {
  createPasswordResetToken,
  findPasswordResetTokenByHash,
  markPasswordResetTokenUsed,
} from '../repositories/password-reset-token.repository.js';
import {
  createRefreshToken,
  findRefreshTokenByHash,
  revokeAllRefreshTokensForUser,
  revokeRefreshToken,
  revokeRefreshTokenFamily,
} from '../repositories/refresh-token.repository.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
} from '../repositories/user.repository.js';

export interface Session {
  user: User;
  accessToken: string;
  rawRefreshToken: string;
}

export interface GoogleProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
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

// Idempotent: an unknown/already-invalid token just means the session is
// already effectively logged out, not an error worth surfacing to the caller.
export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;

  const stored = await findRefreshTokenByHash(hashRefreshToken(rawRefreshToken));
  if (!stored) return;

  await revokeRefreshTokenFamily(stored.familyId);
}

// Architecture §7.3: match an existing linked OAuthAccount first; else link by
// verified email to an existing User (never create a duplicate); else create new.
export async function loginOrRegisterWithGoogle(profile: GoogleProfile): Promise<Session> {
  const existingLink = await findOAuthAccount('google', profile.providerAccountId);
  if (existingLink) return issueSession(existingLink.user);

  const existingUser = await findUserByEmail(profile.email);
  if (existingUser) {
    if (!profile.emailVerified) {
      // Don't silently take over an existing account, and don't let an unhandled
      // DB unique-constraint error leak out either — same email, unverified claim.
      throw new HttpError(
        409,
        'An account with this email already exists. Sign in with your password, or verify this email with Google first.',
      );
    }
    await createOAuthAccount({
      userId: existingUser.id,
      provider: 'google',
      providerAccountId: profile.providerAccountId,
    });
    return issueSession(existingUser);
  }

  const user = await createUser({
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });
  await createOAuthAccount({
    userId: user.id,
    provider: 'google',
    providerAccountId: profile.providerAccountId,
  });

  return issueSession(user);
}

// Always succeeds from the caller's perspective, whether or not the email is
// registered — leaking that would let an attacker enumerate accounts.
export async function requestPasswordReset(input: ForgotPasswordRequest): Promise<void> {
  const user = await findUserByEmail(input.email);
  if (!user) return;

  const rawToken = generateRawResetToken();
  await createPasswordResetToken({
    userId: user.id,
    tokenHash: hashResetToken(rawToken),
    expiresAt: resetTokenExpiry(),
  });

  const resetUrl = new URL('/reset-password', process.env.CORS_ORIGIN ?? 'http://localhost:3000');
  resetUrl.searchParams.set('token', rawToken);
  await sendPasswordResetEmail(user.email, resetUrl.toString());
}

export async function resetPassword(input: ResetPasswordRequest): Promise<void> {
  const stored = await findPasswordResetTokenByHash(hashResetToken(input.token));
  if (!stored) throw new HttpError(400, 'Invalid or expired reset link');
  if (stored.usedAt) throw new HttpError(400, 'This reset link has already been used');
  if (stored.expiresAt < new Date()) throw new HttpError(400, 'This reset link has expired');

  await updateUserPassword(stored.userId, await hashPassword(input.newPassword));
  await markPasswordResetTokenUsed(stored.id);
  // A password reset is a strong signal the old credentials may be compromised —
  // don't leave existing sessions alive on other devices/tabs.
  await revokeAllRefreshTokensForUser(stored.userId);
}
