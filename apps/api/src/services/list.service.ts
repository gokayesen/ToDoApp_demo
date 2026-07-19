import type { Board, List } from '@prisma/client';
import type { CreateListRequest, RenameListRequest } from '@todoapp/shared';

import {
  createListForBoard,
  deleteList as deleteListRow,
  listListsForBoard,
  renameList as renameListRow,
} from '../repositories/list.repository.js';

// FR14: requireRole('MEMBER') on the route already excludes Viewers. Position
// is a placeholder append-at-end value — Story 3.2 introduces the real
// neighbor-based fractional-index algorithm used by drag-and-drop reordering.
export function createList(board: Board, input: CreateListRequest) {
  return createListForBoard(board.id, input.name);
}

export function listLists(board: Board) {
  return listListsForBoard(board.id);
}

export function renameList(list: List, input: RenameListRequest) {
  return renameListRow(list.id, input.name);
}

export async function deleteList(list: List): Promise<void> {
  await deleteListRow(list.id);
}
