import type { Board, List } from '@prisma/client';
import type { CreateListRequest, RenameListRequest } from '@todoapp/shared';

import {
  createListForBoard,
  deleteList as deleteListRow,
  findLastListPosition,
  listListsForBoard,
  renameList as renameListRow,
} from '../repositories/list.repository.js';
import { computePosition } from './position.service.js';

// FR14: requireRole('MEMBER') on the route already excludes Viewers. New Lists
// always append at the end (computePosition against the last position and no
// next neighbor) — the Story 3.5 reorder endpoint is what calls computePosition
// with a live afterId/beforeId pair instead.
export async function createList(board: Board, input: CreateListRequest) {
  const lastPosition = await findLastListPosition(board.id);
  const position = computePosition(lastPosition, null);
  return createListForBoard(board.id, input.name, position);
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
