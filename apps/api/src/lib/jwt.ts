import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = '15m';

export interface AccessTokenPayload {
  sub: string; // userId
}

export function signAccessToken(userId: string): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');

  return jwt.sign({ sub: userId } satisfies AccessTokenPayload, secret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}
