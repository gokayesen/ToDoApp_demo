import type { Checklist, ChecklistItem } from '@prisma/client';
import type {
  CreateChecklistItemRequest,
  MoveChecklistItemRequest,
  UpdateChecklistItemRequest,
} from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { prisma } from '../lib/prisma.js';
import { findCardById } from '../repositories/card.repository.js';
import {
  createChecklistItem as createChecklistItemRow,
  deleteChecklistItem as deleteChecklistItemRow,
  findChecklistItemById,
  findLastChecklistItemPosition,
  updateChecklistItemFields,
  updateChecklistItemPosition,
} from '../repositories/checklist-item.repository.js';
import { emitCardUpdated } from '../sockets/broadcast.js';
import { computePosition } from './position.service.js';

// Same "reload+broadcast the whole parent Card" pattern as checklist.service.ts
// — every mutation below ends by calling this rather than returning the bare
// Checklist/ChecklistItem row.
async function reloadCardAndBroadcast(cardId: string, boardId: string) {
  const updated = await findCardById(cardId);
  emitCardUpdated(boardId, updated!);
  return updated;
}

// FR27: requireRole('MEMBER') on the route already excludes Viewers. New
// items append at the end, same convention as checklist.service.ts
// createChecklist.
export async function createChecklistItem(
  checklist: Checklist,
  boardId: string,
  input: CreateChecklistItemRequest,
) {
  const lastPosition = await findLastChecklistItemPosition(checklist.id);
  const position = computePosition(lastPosition, null);
  await createChecklistItemRow(checklist.id, input.text, position);
  return reloadCardAndBroadcast(checklist.cardId, boardId);
}

// text/isChecked are both independently optional in the input — this serves
// both an inline text edit and a check-toggle without the caller resending
// the field it isn't touching (same convention as card.service.ts updateCard).
export async function updateChecklistItem(
  item: ChecklistItem,
  checklist: Checklist,
  boardId: string,
  input: UpdateChecklistItemRequest,
) {
  await updateChecklistItemFields(item.id, input);
  return reloadCardAndBroadcast(checklist.cardId, boardId);
}

export async function deleteChecklistItem(item: ChecklistItem, checklist: Checklist, boardId: string) {
  await deleteChecklistItemRow(item.id);
  return reloadCardAndBroadcast(checklist.cardId, boardId);
}

// FR27 "reorder items": reorders happen relative to live neighbors within the
// same Checklist, never a client-submitted position (Architecture §4) — same
// pattern as card.service.ts moveCard/list.service.ts moveList, scoped one
// level down (no cross-checklist move; items don't leave their Checklist).
export async function moveChecklistItem(
  item: ChecklistItem,
  checklist: Checklist,
  boardId: string,
  input: MoveChecklistItemRequest,
) {
  const { afterItemId, beforeItemId } = input;

  if (afterItemId === item.id || beforeItemId === item.id) {
    throw new HttpError(400, 'A checklist item cannot be moved relative to itself');
  }

  await prisma.$transaction(async (tx) => {
    const afterItem = afterItemId ? await findChecklistItemById(afterItemId, tx) : null;
    const beforeItem = beforeItemId ? await findChecklistItemById(beforeItemId, tx) : null;

    if (afterItemId && (!afterItem || afterItem.checklistId !== checklist.id)) {
      throw new HttpError(400, 'afterItemId must reference an item on the same checklist');
    }
    if (beforeItemId && (!beforeItem || beforeItem.checklistId !== checklist.id)) {
      throw new HttpError(400, 'beforeItemId must reference an item on the same checklist');
    }

    const position = computePosition(afterItem?.position ?? null, beforeItem?.position ?? null);
    await updateChecklistItemPosition(item.id, position, tx);
  });

  return reloadCardAndBroadcast(checklist.cardId, boardId);
}
