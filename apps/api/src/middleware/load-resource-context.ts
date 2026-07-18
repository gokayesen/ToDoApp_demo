import type { NextFunction, Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import { findBoardMember } from '../repositories/board-member.repository.js';
import { findBoardById } from '../repositories/board.repository.js';
import { findWorkspaceMember } from '../repositories/workspace-member.repository.js';

// Single RBAC choke point (Architecture §5/§7.4). Every mutating board/list/card
// route runs this before requireRole: authenticate -> loadBoardContext -> requireRole.
//
// Effective role resolution:
//   1. WorkspaceMember.role === OWNER on the Workspace that owns this Board =>
//      implicit ADMIN, even with no BoardMember row (the "Owner can do everything
//      an Admin can" guarantee from PRD §5, made mechanical rather than assumed).
//   2. Otherwise, whatever the explicit BoardMember row says.
//   3. Neither => 403. Board not found => 404 (checked first, doesn't leak whether
//      a board exists to someone with no access to it either way since both are
//      opaque 4xx to an unauthorized caller).
export const loadBoardContext = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const board = await findBoardById(req.params.boardId!);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const workspaceMembership = await findWorkspaceMember(board.workspaceId, req.userId!);
    if (workspaceMembership?.role === 'OWNER') {
      req.board = board;
      req.boardRole = 'ADMIN';
      next();
      return;
    }

    const boardMembership = await findBoardMember(board.id, req.userId!);
    if (!boardMembership) {
      res.status(403).json({ error: 'You do not have access to this board' });
      return;
    }

    req.board = board;
    req.boardRole = boardMembership.role;
    next();
  },
);
