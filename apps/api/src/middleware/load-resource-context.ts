import type { NextFunction, Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import { findAttachmentById } from '../repositories/attachment.repository.js';
import { findBoardById } from '../repositories/board.repository.js';
import { findCardById } from '../repositories/card.repository.js';
import { findChecklistItemById } from '../repositories/checklist-item.repository.js';
import { findChecklistById } from '../repositories/checklist.repository.js';
import { findCommentById } from '../repositories/comment.repository.js';
import { findLabelById } from '../repositories/label.repository.js';
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

// Checklist routes carry a :checklistId param — context resolves through its
// owning Card up to Board, same one-level-deeper idea as loadCardContext.
export const loadChecklistContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const checklist = await findChecklistById(req.params.checklistId!);
    if (!checklist) {
      res.status(404).json({ error: 'Checklist not found' });
      return;
    }

    const card = await findCardById(checklist.cardId);
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

    req.checklist = checklist;
    req.card = card;
    req.list = list;
    req.board = board;
    req.boardRole = role;
    next();
  },
);

// Same idea one level deeper still: ChecklistItem -> Checklist -> Card -> List -> Board.
export const loadChecklistItemContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const item = await findChecklistItemById(req.params.itemId!);
    if (!item) {
      res.status(404).json({ error: 'Checklist item not found' });
      return;
    }

    const checklist = await findChecklistById(item.checklistId);
    if (!checklist) {
      res.status(404).json({ error: 'Checklist not found' });
      return;
    }

    const card = await findCardById(checklist.cardId);
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

    req.checklistItem = item;
    req.checklist = checklist;
    req.card = card;
    req.list = list;
    req.board = board;
    req.boardRole = role;
    next();
  },
);

// Comment routes carry a :commentId param — context resolves through its
// owning Card up to Board, same one-level-deeper idea as loadCardContext.
export const loadCommentContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const comment = await findCommentById(req.params.commentId!);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const card = await findCardById(comment.cardId);
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

    req.comment = comment;
    req.card = card;
    req.list = list;
    req.board = board;
    req.boardRole = role;
    next();
  },
);

// Attachment routes carry an :attachmentId param — context resolves through
// its owning Card up to Board, same one-level-deeper idea as loadCardContext.
export const loadAttachmentContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const attachment = await findAttachmentById(req.params.attachmentId!);
    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const card = await findCardById(attachment.cardId);
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

    req.attachment = attachment;
    req.card = card;
    req.list = list;
    req.board = board;
    req.boardRole = role;
    next();
  },
);

// Label routes carry a :labelId param — context resolves straight to the
// owning Board (Label has no intermediate parent, unlike Card/List).
export const loadLabelContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const label = await findLabelById(req.params.labelId!);
    if (!label) {
      res.status(404).json({ error: 'Label not found' });
      return;
    }

    const board = await findBoardById(label.boardId);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const role = await resolveBoardRole(board, req.userId!);
    if (!role) {
      res.status(403).json({ error: 'You do not have access to this board' });
      return;
    }

    req.label = label;
    req.board = board;
    req.boardRole = role;
    next();
  },
);
