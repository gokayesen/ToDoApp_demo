import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as checklistItemService from '../services/checklist-item.service.js';

export const createChecklistItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await checklistItemService.createChecklistItem(req.checklist!, req.board!.id, req.body);
  res.status(201).json(card);
});

export const updateChecklistItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await checklistItemService.updateChecklistItem(
    req.checklistItem!,
    req.checklist!,
    req.board!.id,
    req.body,
  );
  res.json(card);
});

export const deleteChecklistItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await checklistItemService.deleteChecklistItem(req.checklistItem!, req.checklist!, req.board!.id);
  res.json(card);
});

export const moveChecklistItemHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await checklistItemService.moveChecklistItem(
    req.checklistItem!,
    req.checklist!,
    req.board!.id,
    req.body,
  );
  res.json(card);
});
