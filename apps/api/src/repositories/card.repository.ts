import { prisma } from '../lib/prisma.js';

export function findCardById(id: string) {
  return prisma.card.findUnique({ where: { id } });
}

export function listCardsForList(listId: string) {
  return prisma.card.findMany({
    where: { listId, isArchived: false },
    orderBy: { position: 'asc' },
  });
}

// Placeholder append-at-end position until Story 3.2's fractional-index engine.
async function nextCardPosition(listId: string): Promise<number> {
  const last = await prisma.card.findFirst({
    where: { listId },
    orderBy: { position: 'desc' },
  });
  return (last?.position ?? 0) + 1;
}

export async function createCardForList(listId: string, title: string) {
  const position = await nextCardPosition(listId);
  return prisma.card.create({ data: { listId, title, position } });
}

export function deleteCard(id: string) {
  return prisma.card.delete({ where: { id } });
}
