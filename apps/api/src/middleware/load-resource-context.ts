import type { NextFunction, Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import { findBoardById } from '../repositories/board.repository.js';
import { findCardById } from '../repositories/card.repository.js';
import { findListById } from '../repositories/list.repository.js';
import { resolveBoardRole } from '../services/board-role.service.js';

// Single RBAC choke point (Architecture §5/§7.4). Every mutating board/list/card
// route runs one of the loaders below before requireRole: authenticate ->
// load*Context -> requireRole. Board not found => 404 (checked first, doesn't
// leak whether a board exists to someone with no access to it either way
// since both are opaque 4xx to an unauthorized caller).

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
