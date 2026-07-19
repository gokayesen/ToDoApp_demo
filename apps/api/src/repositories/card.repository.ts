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

export function deleteCard(id: string) {
  return prisma.card.delete({ where: { id } });
}
