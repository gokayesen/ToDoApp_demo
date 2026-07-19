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

export async function findLastListPosition(boardId: string): Promise<number | null> {
  const last = await prisma.list.findFirst({
    where: { boardId },
    orderBy: { position: 'desc' },
  });
  return last?.position ?? null;
}

export function createListForBoard(boardId: string, name: string, position: number) {
  return prisma.list.create({ data: { boardId, name, position } });
}

export function renameList(id: string, name: string) {
  return prisma.list.update({ where: { id }, data: { name } });
}

export function deleteList(id: string) {
  return prisma.list.delete({ where: { id } });
}
