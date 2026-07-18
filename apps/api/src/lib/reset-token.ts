import { createHash, randomBytes } from 'node:crypto';

const RESET_TOKEN_TTL_MINUTES = 60;

export function generateRawResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashResetToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function resetTokenExpiry(): Date {
  return new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
}
