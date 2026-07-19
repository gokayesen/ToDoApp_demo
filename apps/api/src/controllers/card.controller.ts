import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as cardService from '../services/card.service.js';

export const createCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.createCard(req.list!, req.body);
  res.status(201).json(card);
});

export const deleteCardHandler = asyncHandler(async (req: Request, res: Response) => {
  await cardService.deleteCard(req.card!);
  res.status(204).end();
});
