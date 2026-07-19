import { prisma } from '../lib/prisma.js';

export function findBoardById(id: string) {
  return prisma.board.findUnique({ where: { id } });
}

export function createBoardForWorkspace(workspaceId: string, name: string) {
  return prisma.board.create({ data: { workspaceId, name } });
}

// Workspace Owner sees every non-archived Board in the Workspace (their access
// is implicit, Architecture §7.4); anyone else only sees ones they have an
// explicit BoardMember row on.
export function listBoardsForWorkspace(workspaceId: string) {
  return prisma.board.findMany({
    where: { workspaceId, isArchived: false },
    orderBy: { name: 'asc' },
  });
}

export function listBoardsForWorkspaceMember(workspaceId: string, userId: string) {
  return prisma.board.findMany({
    where: { workspaceId, isArchived: false, members: { some: { userId } } },
    orderBy: { name: 'asc' },
  });
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
