import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as commentService from '../services/comment.service.js';

export const createCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await commentService.createComment(req.card!, req.board!.id, req.userId!, req.body);
  res.status(201).json(card);
});

export const deleteCommentHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await commentService.deleteComment(
    req.comment!,
    req.card!,
    req.board!.id,
    req.userId!,
    req.boardRole!,
  );
  res.json(card);
});
