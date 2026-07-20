import type {
  Card as PrismaCard,
  Checklist,
  ChecklistItem,
  Label,
  Prisma,
  User,
} from '@prisma/client';

import { prisma } from '../lib/prisma.js';

function toUserProfile(user: User) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

// Accepts an optional transaction client so the move flow (card.service.ts
// moveCard) can read a neighbor's live position and write the moved row's new
// position inside the same DB transaction (Architecture §4 ordering strategy).
type Client = typeof prisma | Prisma.TransactionClient;

// Story 4.3 (FR24) / Story 4.5 (FR26) / Story 4.6 (FR27): every Card-returning
// query below includes+flattens its attached Labels, Assignees, and
// Checklists (with their Items), so `Card.labels`/`Card.assignees`/
// `Card.checklists` (packages/shared) are always populated consistently
// regardless of which endpoint returned the Card — a query that dropped one
// would silently wipe the field for any caller that patches a TanStack Query
// cache with the raw response (card-detail.tsx's title/description save does
// exactly that).
const withRelations = {
  labels: { include: { label: true } },
  assignees: { include: { user: true } },
  checklists: { include: { items: { orderBy: { position: 'asc' } } }, orderBy: { position: 'asc' } },
} satisfies Prisma.CardInclude;

type CardRow = PrismaCard & {
  labels: { label: Label }[];
  assignees: { user: User }[];
  checklists: (Checklist & { items: ChecklistItem[] })[];
};

function mapCard(row: CardRow) {
  const { labels, assignees, ...card } = row;
  return {
    ...card,
    labels: labels.map((cardLabel) => cardLabel.label),
    assignees: assignees.map((cardAssignee) => toUserProfile(cardAssignee.user)),
  };
}

function mapCardOrNull(row: CardRow | null) {
  return row ? mapCard(row) : null;
}

export async function findCardById(id: string, client: Client = prisma) {
  const row = await client.card.findUnique({ where: { id }, include: withRelations });
  return mapCardOrNull(row);
}

export async function listCardsForList(listId: string) {
  const rows = await prisma.card.findMany({
    where: { listId, isArchived: false },
    orderBy: { position: 'asc' },
    include: withRelations,
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
  const row = await prisma.card.create({ data: { listId, title, position }, include: withRelations });
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
    include: withRelations,
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
  const row = await client.card.update({ where: { id }, data, include: withRelations });
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
    include: withRelations,
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

// Story 4.5 (FR26): same upsert-idempotent attach / deleteMany-idempotent
// detach convention as Label attach/detach above.
export async function assignUserToCard(cardId: string, userId: string) {
  await prisma.cardAssignee.upsert({
    where: { cardId_userId: { cardId, userId } },
    create: { cardId, userId },
    update: {},
  });
  return findCardById(cardId);
}

export async function unassignUserFromCard(cardId: string, userId: string) {
  await prisma.cardAssignee.deleteMany({ where: { cardId, userId } });
  return findCardById(cardId);
}
