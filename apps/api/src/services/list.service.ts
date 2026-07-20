import type { Board, List } from '@prisma/client';
import type { CreateListRequest, MoveListRequest, RenameListRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { prisma } from '../lib/prisma.js';
import {
  archiveCardsForListCascade,
  restoreCardsForListCascade,
} from '../repositories/card.repository.js';
import {
  createListForBoard,
  deleteList as deleteListRow,
  findLastListPosition,
  findListById,
  listListsForBoard,
  renameList as renameListRow,
  setListArchived,
  updateListPosition,
} from '../repositories/list.repository.js';
import { emitListCreated, emitListDeleted, emitListMoved, emitListUpdated } from '../sockets/broadcast.js';
import { computePosition } from './position.service.js';

// FR14: requireRole('MEMBER') on the route already excludes Viewers. New Lists
// always append at the end (computePosition against the last position and no
// next neighbor) — the Story 3.5 reorder endpoint is what calls computePosition
// with a live afterId/beforeId pair instead.
export async function createList(board: Board, input: CreateListRequest) {
  const lastPosition = await findLastListPosition(board.id);
  const position = computePosition(lastPosition, null);
  const list = await createListForBoard(board.id, input.name, position);
  emitListCreated(board.id, list);
  return list;
}

export function listLists(board: Board) {
  return listListsForBoard(board.id);
}

export async function renameList(list: List, input: RenameListRequest) {
  const updated = await renameListRow(list.id, input.name);
  emitListUpdated(list.boardId, updated);
  return updated;
}

export async function deleteList(list: List): Promise<void> {
  await deleteListRow(list.id);
  emitListDeleted(list.boardId, list.id);
}

// FR16: requireRole('MEMBER') on the route already excludes Viewers.
// Idempotent, same rationale as board.service.ts archiveBoard/restoreBoard —
// re-affirming an already-(non)archived state isn't a meaningful conflict.
// Cascades to the List's Cards in the same transaction so a client can never
// observe the List archived with its Cards still active. restoreList only
// brings back the Cards this cascade archived (card.repository.ts
// restoreCardsForListCascade) — a Card a user independently archived before
// the List was archived stays archived.
//
// The cascade only broadcasts list:updated, not a card:updated per cascaded
// Card: a client hides an archived List's whole column, cascaded Cards along
// with it, so there's nothing for a per-Card event to add here.
export async function archiveList(list: List): Promise<List> {
  const updated = await prisma.$transaction(async (tx) => {
    await archiveCardsForListCascade(list.id, tx);
    return setListArchived(list.id, true, tx);
  });
  emitListUpdated(list.boardId, updated);
  return updated;
}

export async function restoreList(list: List): Promise<List> {
  const updated = await prisma.$transaction(async (tx) => {
    await restoreCardsForListCascade(list.id, tx);
    return setListArchived(list.id, false, tx);
  });
  emitListUpdated(list.boardId, updated);
  return updated;
}

// FR15: reorders happen relative to live neighbors, never a client-submitted
// position (Architecture §4). Wrapped in a DB transaction so the neighbor
// reads and the position write happen as one atomic unit (NFR8).
export async function moveList(list: List, input: MoveListRequest, actorId: string): Promise<List> {
  const { afterListId, beforeListId } = input;

  if (afterListId === list.id || beforeListId === list.id) {
    throw new HttpError(400, 'A list cannot be moved relative to itself');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const afterList = afterListId ? await findListById(afterListId, tx) : null;
    const beforeList = beforeListId ? await findListById(beforeListId, tx) : null;

    if (afterListId && (!afterList || afterList.boardId !== list.boardId)) {
      throw new HttpError(400, 'afterListId must reference a List on the same board');
    }
    if (beforeListId && (!beforeList || beforeList.boardId !== list.boardId)) {
      throw new HttpError(400, 'beforeListId must reference a List on the same board');
    }

    const position = computePosition(afterList?.position ?? null, beforeList?.position ?? null);
    return updateListPosition(list.id, position, tx);
  });
  emitListMoved(list.boardId, updated, actorId);
  return updated;
}
