import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as checklistService from '../services/checklist.service.js';

export const createChecklistHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await checklistService.createChecklist(req.card!, req.board!.id, req.body);
  res.status(201).json(card);
});

export const deleteChecklistHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await checklistService.deleteChecklist(req.checklist!, req.board!.id);
  res.json(card);
});
