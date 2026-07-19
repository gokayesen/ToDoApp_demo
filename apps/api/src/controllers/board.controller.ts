import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as boardService from '../services/board.service.js';

export const createBoardHandler = asyncHandler(async (req: Request, res: Response) => {
  const board = await boardService.createBoard(req.userId!, req.params.workspaceId!, req.body);
  res.status(201).json(board);
});

// requireRole('ADMIN') already ran (see routes/boards.ts), so req.board is set.
export const inviteBoardMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await boardService.inviteBoardMember(req.userId!, req.board!, req.body);
  res.status(202).json(result);
});
