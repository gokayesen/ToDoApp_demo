import type { Board, BoardRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import { findBoardMember } from '../repositories/board-member.repository.js';
import { findBoardById } from '../repositories/board.repository.js';
import { findCardById } from '../repositories/card.repository.js';
import { findListById } from '../repositories/list.repository.js';
import { findWorkspaceMember } from '../repositories/workspace-member.repository.js';

// Single RBAC choke point (Architecture §5/§7.4). Every mutating board/list/card
// route runs one of the loaders below before requireRole: authenticate ->
// load*Context -> requireRole.
//
// Effective role resolution:
//   1. WorkspaceMember.role === OWNER on the Workspace that owns this Board =>
//      implicit ADMIN, even with no BoardMember row (the "Owner can do everything
//      an Admin can" guarantee from PRD §5, made mechanical rather than assumed).
//   2. Otherwise, whatever the explicit BoardMember row says.
//   3. Neither => null (caller 403s). Board not found => 404 (checked first,
//      doesn't leak whether a board exists to someone with no access to it
//      either way since both are opaque 4xx to an unauthorized caller).
async function resolveBoardRole(board: Board, userId: string): Promise<BoardRole | null> {
  const workspaceMembership = await findWorkspaceMember(board.workspaceId, userId);
  if (workspaceMembership?.role === 'OWNER') return 'ADMIN';

  const boardMembership = await findBoardMember(board.id, userId);
  return boardMembership?.role ?? null;
}

export const loadBoardContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const board = await findBoardById(req.params.boardId!);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const role = await resolveBoardRole(board, req.userId!);
    if (!role) {
      res.status(403).json({ error: 'You do not have access to this board' });
      return;
    }

    req.board = board;
    req.boardRole = role;
    next();
  },
);

// List routes carry a :listId param, not :boardId — context is resolved by
// walking up to the owning Board before applying the same role resolution.
export const loadListContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const list = await findListById(req.params.listId!);
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const board = await findBoardById(list.boardId);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const role = await resolveBoardRole(board, req.userId!);
    if (!role) {
      res.status(403).json({ error: 'You do not have access to this board' });
      return;
    }

    req.list = list;
    req.board = board;
    req.boardRole = role;
    next();
  },
);

// Same idea one level deeper: Card -> List -> Board.
export const loadCardContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const card = await findCardById(req.params.cardId!);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    const list = await findListById(card.listId);
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }

    const board = await findBoardById(list.boardId);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const role = await resolveBoardRole(board, req.userId!);
    if (!role) {
      res.status(403).json({ error: 'You do not have access to this board' });
      return;
    }

    req.card = card;
    req.list = list;
    req.board = board;
    req.boardRole = role;
    next();
  },
);
