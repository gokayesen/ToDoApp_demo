import type { Card, List } from '@prisma/client';
import type { AttachCardLabelRequest, CreateCardRequest, MoveCardRequest, UpdateCardRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { prisma } from '../lib/prisma.js';
import {
  attachLabelToCard,
  createCardForList,
  deleteCard as deleteCardRow,
  detachLabelFromCard,
  findCardById,
  findLastCardPosition,
  listCardsForList,
  setCardArchived,
  updateCardFields,
  updateCardPosition,
} from '../repositories/card.repository.js';
import { findLabelById } from '../repositories/label.repository.js';
import { findListById } from '../repositories/list.repository.js';
import { emitCardCreated, emitCardDeleted, emitCardMoved, emitCardUpdated } from '../sockets/broadcast.js';
import { computePosition } from './position.service.js';

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
export async function updateCard(card: Card, boardId: string, input: UpdateCardRequest): Promise<Card> {
  const updated = await updateCardFields(card.id, input);
  emitCardUpdated(boardId, updated);
  return updated;
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
// (non)archived state isn't a meaningful conflict.
export async function archiveCard(card: Card, boardId: string): Promise<Card> {
  const updated = await setCardArchived(card.id, true);
  emitCardUpdated(boardId, updated);
  return updated;
}

export async function restoreCard(card: Card, boardId: string): Promise<Card> {
  const updated = await setCardArchived(card.id, false);
  emitCardUpdated(boardId, updated);
  return updated;
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

  const updated = await prisma.$transaction(async (tx) => {
    const targetList = listId === currentList.id ? currentList : await findListById(listId, tx);
    if (!targetList || targetList.boardId !== currentList.boardId) {
      throw new HttpError(400, 'listId must reference a List on the same board');
    }

    const afterCard = afterCardId ? await findCardById(afterCardId, tx) : null;
    const beforeCard = beforeCardId ? await findCardById(beforeCardId, tx) : null;

    if (afterCardId && (!afterCard || afterCard.listId !== listId)) {
      throw new HttpError(400, 'afterCardId must reference a Card on the target list');
    }
    if (beforeCardId && (!beforeCard || beforeCard.listId !== listId)) {
      throw new HttpError(400, 'beforeCardId must reference a Card on the target list');
    }

    const position = computePosition(afterCard?.position ?? null, beforeCard?.position ?? null);
    return updateCardPosition(card.id, listId, position, tx);
  });
  emitCardMoved(currentList.boardId, updated, actorId);
  return updated;
}

// FR24: requireRole('MEMBER') on the route already excludes Viewers — same
// gate as every other Card mutation above, distinct from the Label
// taxonomy's own ADMIN-gated CRUD (label.service.ts). Cross-board attach is
// rejected the same way moveCard rejects a cross-board target List.
export async function attachLabel(card: Card, boardId: string, input: AttachCardLabelRequest) {
  const label = await findLabelById(input.labelId);
  if (!label || label.boardId !== boardId) {
    throw new HttpError(400, 'labelId must reference a Label on the same board');
  }

  const updated = await attachLabelToCard(card.id, label.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}

export async function detachLabel(card: Card, boardId: string, labelId: string) {
  const updated = await detachLabelFromCard(card.id, labelId);
  emitCardUpdated(boardId, updated!);
  return updated;
}
