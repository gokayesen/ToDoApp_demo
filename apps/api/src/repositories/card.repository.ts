import type { Card as PrismaCard, Label, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

// Accepts an optional transaction client so the move flow (card.service.ts
// moveCard) can read a neighbor's live position and write the moved row's new
// position inside the same DB transaction (Architecture §4 ordering strategy).
type Client = typeof prisma | Prisma.TransactionClient;

// Story 4.3 (FR24): every Card-returning query below includes+flattens its
// attached Labels, so `Card.labels` (packages/shared) is always populated
// consistently regardless of which endpoint returned the Card — a query that
// dropped it would silently wipe the field for any caller that patches a
// TanStack Query cache with the raw response (card-detail.tsx's title/
// description save does exactly that).
const withLabels = { labels: { include: { label: true } } } satisfies Prisma.CardInclude;

type CardRow = PrismaCard & { labels: { label: Label }[] };

function mapCard(row: CardRow) {
  const { labels, ...card } = row;
  return { ...card, labels: labels.map((cardLabel) => cardLabel.label) };
}

function mapCardOrNull(row: CardRow | null) {
  return row ? mapCard(row) : null;
}

export async function findCardById(id: string, client: Client = prisma) {
  const row = await client.card.findUnique({ where: { id }, include: withLabels });
  return mapCardOrNull(row);
}

export async function listCardsForList(listId: string) {
  const rows = await prisma.card.findMany({
    where: { listId, isArchived: false },
    orderBy: { position: 'asc' },
    include: withLabels,
  });
  return rows.map(mapCard);
}

export async function findLastCardPosition(listId: string): Promise<number | null> {
  const last = await prisma.card.findFirst({
    where: { listId },
    orderBy: { position: 'desc' },
  });
  return last?.position ?? null;
}

export async function createCardForList(listId: string, title: string, position: number) {
  const row = await prisma.card.create({ data: { listId, title, position }, include: withLabels });
  return mapCard(row);
}

export async function updateCardPosition(
  id: string,
  listId: string,
  position: number,
  client: Client = prisma,
) {
  const row = await client.card.update({
    where: { id },
    data: { listId, position },
    include: withLabels,
  });
  return mapCard(row);
}

// Story 4.2 (FR18) / Story 4.4 (FR25): every field is independently optional
// in the input, so this only writes the keys actually present rather than a
// fixed shape that would null out fields not being edited on a given save.
export async function updateCardFields(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    startDate?: Date | null;
    dueDate?: Date | null;
  },
  client: Client = prisma,
) {
  const row = await client.card.update({ where: { id }, data, include: withLabels });
  return mapCard(row);
}

export function deleteCard(id: string) {
  return prisma.card.delete({ where: { id } });
}

// Story 3.8 (FR21) direct per-Card archive/restore, distinct from the Story
// 3.7 List-archive cascade below. Restoring always clears archivedWithList
// too — once a Card is explicitly restored on its own, it's no longer
// tracking a cascade it might otherwise be swept back into by an unrelated
// future List restore.
export async function setCardArchived(id: string, isArchived: boolean, client: Client = prisma) {
  const row = await client.card.update({
    where: { id },
    data: isArchived ? { isArchived: true } : { isArchived: false, archivedWithList: false },
    include: withLabels,
  });
  return mapCard(row);
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

// Story 4.3 (FR24): attach is upsert-idempotent (attaching an already-
// attached Label is a no-op, not a unique-constraint 500), detach is a
// deleteMany for the same reason (no error detaching a Label that's already
// off the Card) — same idempotent-mutation convention as archive/restore.
export async function attachLabelToCard(cardId: string, labelId: string) {
  await prisma.cardLabel.upsert({
    where: { cardId_labelId: { cardId, labelId } },
    create: { cardId, labelId },
    update: {},
  });
  return findCardById(cardId);
}

export async function detachLabelFromCard(cardId: string, labelId: string) {
  await prisma.cardLabel.deleteMany({ where: { cardId, labelId } });
  return findCardById(cardId);
}
