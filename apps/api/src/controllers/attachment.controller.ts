import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as attachmentService from '../services/attachment.service.js';

export const presignAttachmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await attachmentService.presignUpload(req.card!.id, req.body);
  res.json(result);
});

export const createAttachmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await attachmentService.createAttachment(req.card!, req.board!.id, req.userId!, req.body);
  res.status(201).json(card);
});

export const deleteAttachmentHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await attachmentService.deleteAttachment(
    req.attachment!,
    req.card!,
    req.board!.id,
    req.userId!,
    req.boardRole!,
  );
  res.json(card);
});
