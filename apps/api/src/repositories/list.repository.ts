import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

// Accepts an optional transaction client so the move flow (list.service.ts
// moveList) can read a neighbor's live position and write the moved row's new
// position inside the same DB transaction (Architecture §4 ordering strategy).
type Client = typeof prisma | Prisma.TransactionClient;

export function findListById(id: string, client: Client = prisma) {
  return client.list.findUnique({ where: { id } });
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

export function updateListPosition(id: string, position: number, client: Client = prisma) {
  return client.list.update({ where: { id }, data: { position } });
}

export function deleteList(id: string) {
  return prisma.list.delete({ where: { id } });
}
