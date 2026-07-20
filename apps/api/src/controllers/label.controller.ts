import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as labelService from '../services/label.service.js';

export const listLabelsHandler = asyncHandler(async (req: Request, res: Response) => {
  const labels = await labelService.listLabels(req.board!);
  res.json(labels);
});

export const createLabelHandler = asyncHandler(async (req: Request, res: Response) => {
  const label = await labelService.createLabel(req.board!, req.body);
  res.status(201).json(label);
});

export const updateLabelHandler = asyncHandler(async (req: Request, res: Response) => {
  const label = await labelService.updateLabel(req.label!, req.body);
  res.json(label);
});

export const deleteLabelHandler = asyncHandler(async (req: Request, res: Response) => {
  await labelService.deleteLabel(req.label!);
  res.status(204).end();
});
