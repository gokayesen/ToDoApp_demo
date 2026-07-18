import { prisma } from '../lib/prisma.js';

export function findOAuthAccount(provider: string, providerAccountId: string) {
  return prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    include: { user: true },
  });
}

export function createOAuthAccount(input: {
  userId: string;
  provider: string;
  providerAccountId: string;
}) {
  return prisma.oAuthAccount.create({ data: input });
}
