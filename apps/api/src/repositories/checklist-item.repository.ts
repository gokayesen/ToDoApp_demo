import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

type Client = typeof prisma | Prisma.TransactionClient;

export function findChecklistItemById(id: string, client: Client = prisma) {
  return client.checklistItem.findUnique({ where: { id } });
}

export async function findLastChecklistItemPosition(checklistId: string): Promise<number | null> {
  const last = await prisma.checklistItem.findFirst({
    where: { checklistId },
    orderBy: { position: 'desc' },
  });
  return last?.position ?? null;
}

export function createChecklistItem(checklistId: string, text: string, position: number) {
  return prisma.checklistItem.create({ data: { checklistId, text, position } });
}

// text/isChecked are both independently optional in the input, same
// only-write-present-keys convention as card.repository.ts updateCardFields.
export function updateChecklistItemFields(id: string, data: { text?: string; isChecked?: boolean }) {
  return prisma.checklistItem.update({ where: { id }, data });
}

export function updateChecklistItemPosition(id: string, position: number, client: Client = prisma) {
  return client.checklistItem.update({ where: { id }, data: { position } });
}

export function deleteChecklistItem(id: string) {
  return prisma.checklistItem.delete({ where: { id } });
}
