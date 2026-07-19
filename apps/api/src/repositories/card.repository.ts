import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

// Accepts an optional transaction client so the move flow (card.service.ts
// moveCard) can read a neighbor's live position and write the moved row's new
// position inside the same DB transaction (Architecture §4 ordering strategy).
type Client = typeof prisma | Prisma.TransactionClient;

export function findCardById(id: string, client: Client = prisma) {
  return client.card.findUnique({ where: { id } });
}

export function listCardsForList(listId: string) {
  return prisma.card.findMany({
    where: { listId, isArchived: false },
    orderBy: { position: 'asc' },
  });
}

export async function findLastCardPosition(listId: string): Promise<number | null> {
  const last = await prisma.card.findFirst({
    where: { listId },
    orderBy: { position: 'desc' },
  });
  return last?.position ?? null;
}

export function createCardForList(listId: string, title: string, position: number) {
  return prisma.card.create({ data: { listId, title, position } });
}

export function updateCardPosition(id: string, listId: string, position: number, client: Client = prisma) {
  return client.card.update({ where: { id }, data: { listId, position } });
}

export function deleteCard(id: string) {
  return prisma.card.delete({ where: { id } });
}
