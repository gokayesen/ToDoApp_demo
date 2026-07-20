import type { Board, Label } from '@prisma/client';
import type { CreateLabelRequest, UpdateLabelRequest } from '@todoapp/shared';

import {
  createLabelForBoard,
  deleteLabel as deleteLabelRow,
  listLabelsForBoard,
  updateLabelFields,
} from '../repositories/label.repository.js';

// FR24: Board-scoped Label taxonomy. Gated ADMIN on the routes (not MEMBER
// like List/Card content mutations) — same rationale as board background
// customization (Story 2.9): a Label is board-wide configuration every
// member sees, not one member's own content.
export function listLabels(board: Board): Promise<Label[]> {
  return listLabelsForBoard(board.id);
}

export function createLabel(board: Board, input: CreateLabelRequest): Promise<Label> {
  return createLabelForBoard(board.id, input.name, input.color);
}

export function updateLabel(label: Label, input: UpdateLabelRequest): Promise<Label> {
  return updateLabelFields(label.id, input);
}

export async function deleteLabel(label: Label): Promise<void> {
  await deleteLabelRow(label.id);
}
