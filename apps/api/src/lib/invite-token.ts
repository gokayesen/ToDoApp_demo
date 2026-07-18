import { createHash, randomBytes } from 'node:crypto';

const INVITE_TOKEN_TTL_DAYS = 7;

export function generateRawInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInviteToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function inviteTokenExpiry(): Date {
  return new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
