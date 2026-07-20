import type { Card, List } from '@prisma/client';
import type {
  AssignCardRequest,
  AttachCardLabelRequest,
  CreateCardRequest,
  MoveCardRequest,
  UpdateCardRequest,
} from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { prisma } from '../lib/prisma.js';
import { findBoardMember } from '../repositories/board-member.repository.js';
import {
  assignUserToCard,
  attachLabelToCard,
  createCardForList,
  deleteCard as deleteCardRow,
  detachLabelFromCard,
  findCardById,
  findLastCardPosition,
  listCardsForList,
  setCardArchived,
  unassignUserFromCard,
  updateCardFields,
  updateCardPosition,
} from '../repositories/card.repository.js';
import { findLabelById } from '../repositories/label.repository.js';
import { findListById } from '../repositories/list.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import {
  emitCardCreated,
  emitCardDeleted,
  emitCardMoved,
  emitCardUpdated,
} from '../sockets/broadcast.js';
import { logActivity } from './activity-log.service.js';
import { computePosition } from './position.service.js';

function dateChanged(before: Date | null, after: Date | null | undefined): boolean {
  return after !== undefined && (before?.getTime() ?? null) !== (after?.getTime() ?? null);
}

// FR17: same MEMBER-minimum role gate and append-at-end positioning as
// list.service.ts createList.
export async function createCard(list: List, input: CreateCardRequest, actorId: string) {
  const lastPosition = await findLastCardPosition(list.id);
  const position = computePosition(lastPosition, null);
  const card = await createCardForList(list.id, input.title, position);
  emitCardCreated(list.boardId, card, actorId);
  return card;
}

export function listCards(list: List) {
  return listCardsForList(list.id);
}

// FR18: inline-editable title/description (Story 4.2). requireRole('MEMBER')
// on the route already excludes Viewers, same gate as every other Card
// mutation above.
//
// FR33 (Story 5.6, UX §6): optimistic-concurrency check — `card` here is the
// row loadCardContext just loaded for this request, so if the caller's
// expectedUpdatedAt (captured when it started this edit session) doesn't
// match it, someone else's write landed in between. Reject rather than
// silently overwrite; the loser's client already has the winner's change via
// the live card:updated broadcast (Story 5.4) by the time this 409 arrives,
// so "your view has been refreshed" in the message is already true.
export async function updateCard(
  card: Card,
  boardId: string,
  actorId: string,
  input: UpdateCardRequest,
): Promise<Card> {
  const { expectedUpdatedAt, ...fields } = input;
  if (expectedUpdatedAt && expectedUpdatedAt.getTime() !== card.updatedAt.getTime()) {
    const fresh = await findCardById(card.id);
    const lastEditor = fresh?.activityLog.at(-1)?.actorNameSnapshot ?? 'someone else';
    throw new HttpError(
      409,
      `This card was just updated by ${lastEditor} — your view has been refreshed.`,
    );
  }

  await updateCardFields(card.id, fields);

  // FR30: one entry per field that actually changed, not one generic "card
  // updated" entry — an actionable Activity feed names what happened.
  if (input.title !== undefined && input.title !== card.title) {
    await logActivity({
      boardId,
      cardId: card.id,
      actorId,
      type: 'card.renamed',
      metadata: { from: card.title, to: input.title },
    });
  }
  if (input.description !== undefined && input.description !== card.description) {
    await logActivity({
      boardId,
      cardId: card.id,
      actorId,
      type: 'card.description_updated',
      metadata: {},
    });
  }
  if (dateChanged(card.startDate, input.startDate)) {
    await logActivity({
      boardId,
      cardId: card.id,
      actorId,
      type: 'card.start_date_changed',
      metadata: {
        from: card.startDate?.toISOString() ?? null,
        to: input.startDate?.toISOString() ?? null,
      },
    });
  }
  if (dateChanged(card.dueDate, input.dueDate)) {
    await logActivity({
      boardId,
      cardId: card.id,
      actorId,
      type: 'card.due_date_changed',
      metadata: {
        from: card.dueDate?.toISOString() ?? null,
        to: input.dueDate?.toISOString() ?? null,
      },
    });
  }

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated!;
}

// boardId comes from the caller (card.controller.ts's req.board) rather than
// being looked up here — a Card only carries its listId, and every mutating
// Card route already resolves the owning Board via loadCardContext, so
// re-deriving it with an extra query would be redundant.
export async function deleteCard(card: Card, boardId: string): Promise<void> {
  await deleteCardRow(card.id);
  emitCardDeleted(boardId, card.id, card.listId);
}

// FR21: requireRole('MEMBER') on the route already excludes Viewers.
// Idempotent, same rationale as board.service.ts archiveBoard/restoreBoard
// and list.service.ts archiveList/restoreList — re-affirming an already-
// (non)archived state isn't a meaningful conflict. Only logs an Activity
// entry when the state actually flips, so re-affirming an already-
// (non)archived state doesn't also spam the feed with a no-op entry.
export async function archiveCard(card: Card, boardId: string, actorId: string): Promise<Card> {
  await setCardArchived(card.id, true);
  if (!card.isArchived) {
    await logActivity({ boardId, cardId: card.id, actorId, type: 'card.archived', metadata: {} });
  }
  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated!;
}

export async function restoreCard(card: Card, boardId: string, actorId: string): Promise<Card> {
  await setCardArchived(card.id, false);
  if (card.isArchived) {
    await logActivity({ boardId, cardId: card.id, actorId, type: 'card.restored', metadata: {} });
  }
  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated!;
}

// FR19: reorders/moves happen relative to live neighbors on the target List,
// never a client-submitted position (Architecture §4) — same pattern as
// list.service.ts moveList, extended to allow the target List to differ from
// the Card's current one (cross-list move). `currentList` is the Card's List
// before this move, used only to confirm the target List is on the same
// Board — cross-board moves are the out-of-scope Story 3.10 stretch goal.
export async function moveCard(
  card: Card,
  currentList: List,
  input: MoveCardRequest,
  actorId: string,
): Promise<Card> {
  const { listId, afterCardId, beforeCardId } = input;

  if (afterCardId === card.id || beforeCardId === card.id) {
    throw new HttpError(400, 'A card cannot be moved relative to itself');
  }

  let targetListName = currentList.name;
  await prisma.$transaction(async (tx) => {
    const targetList = listId === currentList.id ? currentList : await findListById(listId, tx);
    if (!targetList || targetList.boardId !== currentList.boardId) {
      throw new HttpError(400, 'listId must reference a List on the same board');
    }
    targetListName = targetList.name;

    const afterCard = afterCardId ? await findCardById(afterCardId, tx) : null;
    const beforeCard = beforeCardId ? await findCardById(beforeCardId, tx) : null;

    if (afterCardId && (!afterCard || afterCard.listId !== listId)) {
      throw new HttpError(400, 'afterCardId must reference a Card on the target list');
    }
    if (beforeCardId && (!beforeCard || beforeCard.listId !== listId)) {
      throw new HttpError(400, 'beforeCardId must reference a Card on the target list');
    }

    const position = computePosition(afterCard?.position ?? null, beforeCard?.position ?? null);
    await updateCardPosition(card.id, listId, position, tx);
  });

  // FR30 / UX §4.3 example ("Ayşe moved this card from To Do to Doing"): only
  // a cross-list move is worth an Activity entry — a pure within-list
  // reorder is just visual ordering, not a status change.
  if (listId !== currentList.id) {
    await logActivity({
      boardId: currentList.boardId,
      cardId: card.id,
      actorId,
      type: 'card.moved',
      metadata: { fromListName: currentList.name, toListName: targetListName },
    });
  }

  const updated = await findCardById(card.id);
  emitCardMoved(currentList.boardId, updated!, actorId);
  return updated!;
}

// FR24: requireRole('MEMBER') on the route already excludes Viewers — same
// gate as every other Card mutation above, distinct from the Label
// taxonomy's own ADMIN-gated CRUD (label.service.ts). Cross-board attach is
// rejected the same way moveCard rejects a cross-board target List.
export async function attachLabel(
  card: Card,
  boardId: string,
  actorId: string,
  input: AttachCardLabelRequest,
) {
  const label = await findLabelById(input.labelId);
  if (!label || label.boardId !== boardId) {
    throw new HttpError(400, 'labelId must reference a Label on the same board');
  }

  await attachLabelToCard(card.id, label.id);
  await logActivity({
    boardId,
    cardId: card.id,
    actorId,
    type: 'label.attached',
    metadata: { labelName: label.name },
  });

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}

export async function detachLabel(card: Card, boardId: string, actorId: string, labelId: string) {
  const label = await findLabelById(labelId);

  await detachLabelFromCard(card.id, labelId);
  if (label) {
    await logActivity({
      boardId,
      cardId: card.id,
      actorId,
      type: 'label.detached',
      metadata: { labelName: label.name },
    });
  }

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}

// FR26: requireRole('MEMBER') on the route already excludes Viewers — same
// gate as every other Card mutation above. The assignee must be an explicit
// Board Member (see board-member.repository.ts listBoardMembers comment on
// why the Workspace Owner's implicit access doesn't count here either).
export async function assignUser(
  card: Card,
  boardId: string,
  actorId: string,
  input: AssignCardRequest,
) {
  const membership = await findBoardMember(boardId, input.userId);
  if (!membership) throw new HttpError(400, 'userId must reference a member of this board');

  const assignee = await findUserById(input.userId);
  await assignUserToCard(card.id, input.userId);
  await logActivity({
    boardId,
    cardId: card.id,
    actorId,
    type: 'assignee.added',
    metadata: { userName: assignee!.name },
  });

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}

export async function unassignUser(card: Card, boardId: string, actorId: string, userId: string) {
  const assignee = await findUserById(userId);

  await unassignUserFromCard(card.id, userId);
  if (assignee) {
    await logActivity({
      boardId,
      cardId: card.id,
      actorId,
      type: 'assignee.removed',
      metadata: { userName: assignee.name },
    });
  }

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}
