import type { Card, List } from '@prisma/client';
import type { CreateCardRequest, MoveCardRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { prisma } from '../lib/prisma.js';
import {
  createCardForList,
  deleteCard as deleteCardRow,
  findCardById,
  findLastCardPosition,
  listCardsForList,
  updateCardPosition,
} from '../repositories/card.repository.js';
import { findListById } from '../repositories/list.repository.js';
import { computePosition } from './position.service.js';

// FR17: same MEMBER-minimum role gate and append-at-end positioning as
// list.service.ts createList.
export async function createCard(list: List, input: CreateCardRequest) {
  const lastPosition = await findLastCardPosition(list.id);
  const position = computePosition(lastPosition, null);
  return createCardForList(list.id, input.title, position);
}

export function listCards(list: List) {
  return listCardsForList(list.id);
}

export async function deleteCard(card: Card): Promise<void> {
  await deleteCardRow(card.id);
}

// FR19: reorders/moves happen relative to live neighbors on the target List,
// never a client-submitted position (Architecture §4) — same pattern as
// list.service.ts moveList, extended to allow the target List to differ from
// the Card's current one (cross-list move). `currentList` is the Card's List
// before this move, used only to confirm the target List is on the same
// Board — cross-board moves are the out-of-scope Story 3.10 stretch goal.
export async function moveCard(card: Card, currentList: List, input: MoveCardRequest): Promise<Card> {
  const { listId, afterCardId, beforeCardId } = input;

  if (afterCardId === card.id || beforeCardId === card.id) {
    throw new HttpError(400, 'A card cannot be moved relative to itself');
  }

  return prisma.$transaction(async (tx) => {
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
}
