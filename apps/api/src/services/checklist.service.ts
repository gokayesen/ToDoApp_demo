import type { Card, Checklist } from '@prisma/client';
import type { CreateChecklistRequest } from '@todoapp/shared';

import { findCardById } from '../repositories/card.repository.js';
import {
  createChecklistForCard,
  deleteChecklist as deleteChecklistRow,
  findLastChecklistPosition,
} from '../repositories/checklist.repository.js';
import { emitCardUpdated } from '../sockets/broadcast.js';
import { logActivity } from './activity-log.service.js';
import { computePosition } from './position.service.js';

// FR27: requireRole('MEMBER') on the route already excludes Viewers, same
// gate as every other Card-content mutation. New Checklists append at the
// end, same convention as new Lists/Cards (Story 3.1/3.2) — no reorder-
// checklist endpoint exists (see schema.prisma's Checklist model comment).
// Returns the whole parent Card, not just the created Checklist, so the
// caller broadcasts/cache-patches the same way Label/Assignee mutations
// already do (Story 4.3/4.5) — card:updated carries the full Card including
// its checklists.
export async function createChecklist(card: Card, boardId: string, actorId: string, input: CreateChecklistRequest) {
  const lastPosition = await findLastChecklistPosition(card.id);
  const position = computePosition(lastPosition, null);
  await createChecklistForCard(card.id, input.title, position);
  await logActivity({
    boardId,
    cardId: card.id,
    actorId,
    type: 'checklist.created',
    metadata: { title: input.title },
  });

  const updated = await findCardById(card.id);
  emitCardUpdated(boardId, updated!);
  return updated;
}

export async function deleteChecklist(checklist: Checklist, boardId: string, actorId: string) {
  await deleteChecklistRow(checklist.id);
  await logActivity({
    boardId,
    cardId: checklist.cardId,
    actorId,
    type: 'checklist.deleted',
    metadata: { title: checklist.title },
  });

  const updated = await findCardById(checklist.cardId);
  emitCardUpdated(boardId, updated!);
  return updated;
}
