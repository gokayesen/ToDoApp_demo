import { randomUUID } from 'node:crypto';

import { prisma } from '../lib/prisma.js';

export function createRefreshToken(input: {
  userId: string;
  tokenHash: string;
  familyId?: string;
  expiresAt: Date;
}) {
  return prisma.refreshToken.create({
    data: {
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId ?? randomUUID(),
      expiresAt: input.expiresAt,
    },
  });
}

export function findRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.findFirst({ where: { tokenHash } });
}

export function revokeRefreshToken(id: string) {
  return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
}

export function revokeRefreshTokenFamily(familyId: string) {
  return prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
