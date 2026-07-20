import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as listService from '../services/list.service.js';

export const createListHandler = asyncHandler(async (req: Request, res: Response) => {
  const list = await listService.createList(req.board!, req.body);
  res.status(201).json(list);
});

export const listListsHandler = asyncHandler(async (req: Request, res: Response) => {
  const lists = await listService.listLists(req.board!);
  res.json(lists);
});

export const renameListHandler = asyncHandler(async (req: Request, res: Response) => {
  const list = await listService.renameList(req.list!, req.body);
  res.json(list);
});

export const deleteListHandler = asyncHandler(async (req: Request, res: Response) => {
  await listService.deleteList(req.list!);
  res.status(204).end();
});

export const moveListHandler = asyncHandler(async (req: Request, res: Response) => {
  const list = await listService.moveList(req.list!, req.body, req.userId!);
  res.json(list);
});

export const archiveListHandler = asyncHandler(async (req: Request, res: Response) => {
  const list = await listService.archiveList(req.list!);
  res.json(list);
});

export const restoreListHandler = asyncHandler(async (req: Request, res: Response) => {
  const list = await listService.restoreList(req.list!);
  res.json(list);
});
