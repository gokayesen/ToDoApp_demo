import { prisma } from '../lib/prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUser(input: { email: string; passwordHash: string; name: string }) {
  return prisma.user.create({ data: input });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}
