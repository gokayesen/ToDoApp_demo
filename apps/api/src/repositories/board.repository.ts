import { prisma } from '../lib/prisma.js';

export function findBoardById(id: string) {
  return prisma.board.findUnique({ where: { id } });
}
