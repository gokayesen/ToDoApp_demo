import { prisma } from '../lib/prisma.js';

export function createPasswordResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.passwordResetToken.create({ data: input });
}

export function findPasswordResetTokenByHash(tokenHash: string) {
  return prisma.passwordResetToken.findFirst({ where: { tokenHash } });
}

export function markPasswordResetTokenUsed(id: string) {
  return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
}
