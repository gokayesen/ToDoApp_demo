import { prisma } from '../lib/prisma.js';

export function findBoardById(id: string) {
  return prisma.board.findUnique({ where: { id } });
}

export function createBoardForWorkspace(workspaceId: string, name: string) {
  return prisma.board.create({ data: { workspaceId, name } });
}
