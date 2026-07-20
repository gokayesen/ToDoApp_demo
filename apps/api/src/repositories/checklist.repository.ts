import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

// Accepts an optional transaction client so the move flow (checklist-item
// reorder, checklist-item.service.ts) can read a neighbor's live position and
// write the moved row's new position inside the same DB transaction
// (Architecture §4 ordering strategy) — same convention as card/list repos.
type Client = typeof prisma | Prisma.TransactionClient;

export function findChecklistById(id: string, client: Client = prisma) {
  return client.checklist.findUnique({ where: { id } });
}

export async function findLastChecklistPosition(cardId: string): Promise<number | null> {
  const last = await prisma.checklist.findFirst({
    where: { cardId },
    orderBy: { position: 'desc' },
  });
  return last?.position ?? null;
}

export function createChecklistForCard(cardId: string, title: string, position: number) {
  return prisma.checklist.create({ data: { cardId, title, position } });
}

export function deleteChecklist(id: string) {
  return prisma.checklist.delete({ where: { id } });
}
