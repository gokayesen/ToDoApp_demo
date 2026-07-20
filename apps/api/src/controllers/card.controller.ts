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

export const updateCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.updateCard(req.card!, req.board!.id, req.userId!, req.body);
  res.json(card);
});

export const deleteCardHandler = asyncHandler(async (req: Request, res: Response) => {
  await cardService.deleteCard(req.card!, req.board!.id);
  res.status(204).end();
});

export const moveCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.moveCard(req.card!, req.list!, req.body, req.userId!);
  res.json(card);
});

export const attachLabelHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.attachLabel(req.card!, req.board!.id, req.userId!, req.body);
  res.json(card);
});

export const detachLabelHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.detachLabel(req.card!, req.board!.id, req.userId!, req.params.labelId!);
  res.json(card);
});

export const assignUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.assignUser(req.card!, req.board!.id, req.userId!, req.body);
  res.json(card);
});

export const unassignUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.unassignUser(req.card!, req.board!.id, req.userId!, req.params.userId!);
  res.json(card);
});

export const archiveCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.archiveCard(req.card!, req.board!.id, req.userId!);
  res.json(card);
});

export const restoreCardHandler = asyncHandler(async (req: Request, res: Response) => {
  const card = await cardService.restoreCard(req.card!, req.board!.id, req.userId!);
  res.json(card);
});
