import { prisma } from '../lib/prisma.js';

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUser(input: {
  email: string;
  name: string;
  passwordHash?: string;
  avatarUrl?: string;
}) {
  return prisma.user.create({ data: input });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function updateUserPassword(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}

export function updateUserProfile(id: string, input: { name?: string; avatarUrl?: string | null }) {
  return prisma.user.update({ where: { id }, data: input });
}
