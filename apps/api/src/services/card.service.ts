import type { Card, List } from '@prisma/client';
import type { CreateCardRequest } from '@todoapp/shared';

import { createCardForList, deleteCard as deleteCardRow } from '../repositories/card.repository.js';

// FR17: same MEMBER-minimum role gate and placeholder-position note as
// list.service.ts createList.
export function createCard(list: List, input: CreateCardRequest) {
  return createCardForList(list.id, input.title);
}

export async function deleteCard(card: Card): Promise<void> {
  await deleteCardRow(card.id);
}
