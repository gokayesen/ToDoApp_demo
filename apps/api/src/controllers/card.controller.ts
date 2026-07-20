import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as cardService from '../services/card.service.js';

export const createCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.createCard(req.list!, req.body, req.userId!);
  res.status(201).json(card);
});

export const listCardsHandler = asyncHandler(async (req: Request, res: Response) => {
  const cards = await cardService.listCards(req.list!);
  res.json(cards);
});

export const deleteCardHandler = asyncHandler(async (req: Request, res: Response) => {
  await cardService.deleteCard(req.card!, req.board!.id);
  res.status(204).end();
});

export const moveCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.moveCard(req.card!, req.list!, req.body, req.userId!);
  res.json(card);
});

export const archiveCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.archiveCard(req.card!, req.board!.id);
  res.json(card);
});

export const restoreCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.restoreCard(req.card!, req.board!.id);
  res.json(card);
});
