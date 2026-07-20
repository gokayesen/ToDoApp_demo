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

// Story 4.2 (FR18): title/description are independently optional in the
// input, so this only writes the keys actually present rather than a fixed
// { title, description } shape that would null out the field not being
// edited on every save.
export function updateCardFields(
  id: string,
  data: { title?: string; description?: string | null },
  client: Client = prisma,
) {
  return client.card.update({ where: { id }, data });
}

export function deleteCard(id: string) {
  return prisma.card.delete({ where: { id } });
}

// Story 3.8 (FR21) direct per-Card archive/restore, distinct from the Story
// 3.7 List-archive cascade below. Restoring always clears archivedWithList
// too — once a Card is explicitly restored on its own, it's no longer
// tracking a cascade it might otherwise be swept back into by an unrelated
// future List restore.
export function setCardArchived(id: string, isArchived: boolean, client: Client = prisma) {
  return client.card.update({
    where: { id },
    data: isArchived ? { isArchived: true } : { isArchived: false, archivedWithList: false },
  });
}

// Story 3.7 (FR16) List archive cascade: only touches Cards that are
// currently active, so a Card a user independently archived beforehand (once
// Story 3.8 exists) is left alone rather than double-marked.
export function archiveCardsForListCascade(listId: string, client: Client = prisma) {
  return client.card.updateMany({
    where: { listId, isArchived: false },
    data: { isArchived: true, archivedWithList: true },
  });
}

// Inverse of the above: only restores Cards this List's own archive cascade
// archived, not ones a user independently archived before the List was
// archived.
export function restoreCardsForListCascade(listId: string, client: Client = prisma) {
  return client.card.updateMany({
    where: { listId, archivedWithList: true },
    data: { isArchived: false, archivedWithList: false },
  });
}
