import { prisma } from '../lib/prisma.js';

export function findBoardById(id: string) {
  return prisma.board.findUnique({ where: { id } });
}

export function createBoardForWorkspace(workspaceId: string, name: string) {
  return prisma.board.create({ data: { workspaceId, name } });
}

export function setBoardArchived(id: string, isArchived: boolean) {
  return prisma.board.update({ where: { id }, data: { isArchived } });
}

export function deleteBoard(id: string) {
  return prisma.board.delete({ where: { id } });
}

export function setBoardBackground(id: string, background: string | null) {
  return prisma.board.update({ where: { id }, data: { background } });
}
