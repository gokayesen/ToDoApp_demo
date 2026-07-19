import type { Card, List } from '@prisma/client';
import type { CreateCardRequest } from '@todoapp/shared';

import {
  createCardForList,
  deleteCard as deleteCardRow,
  findLastCardPosition,
  listCardsForList,
} from '../repositories/card.repository.js';
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
