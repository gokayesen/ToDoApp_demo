import { prisma } from '../lib/prisma.js';

export function findListById(id: string) {
  return prisma.list.findUnique({ where: { id } });
}

export function listListsForBoard(boardId: string) {
  return prisma.list.findMany({
    where: { boardId, isArchived: false },
    orderBy: { position: 'asc' },
  });
}

// Placeholder append-at-end position until Story 3.2's fractional-index engine.
async function nextListPosition(boardId: string): Promise<number> {
  const last = await prisma.list.findFirst({
    where: { boardId },
    orderBy: { position: 'desc' },
  });
  return (last?.position ?? 0) + 1;
}

export async function createListForBoard(boardId: string, name: string) {
  const position = await nextListPosition(boardId);
  return prisma.list.create({ data: { boardId, name, position } });
}

export function renameList(id: string, name: string) {
  return prisma.list.update({ where: { id }, data: { name } });
}

export function deleteList(id: string) {
  return prisma.list.delete({ where: { id } });
}
