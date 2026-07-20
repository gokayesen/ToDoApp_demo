import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as boardService from '../services/board.service.js';

export const createBoardHandler = asyncHandler(async (req: Request, res: Response) => {
  const board = await boardService.createBoard(req.userId!, req.params.workspaceId!, req.body);
  res.status(201).json(board);
});

export const getBoardHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(boardService.getBoard(req.board!));
});

export const listBoardsHandler = asyncHandler(async (req: Request, res: Response) => {
  const boards = await boardService.listBoards(req.userId!, req.params.workspaceId!);
  res.json(boards);
});

// Story 4.5 (FR26): powers the Card assignee picker. requireRole('VIEWER')
// on the route already confirms access.
export const listBoardMembersHandler = asyncHandler(async (req: Request, res: Response) => {
  const members = await boardService.listBoardMembers(req.board!);
  res.json(members);
});

// requireRole('ADMIN') already ran (see routes/boards.ts), so req.board is set.
export const inviteBoardMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await boardService.inviteBoardMember(req.userId!, req.board!, req.body);
  res.status(202).json(result);
});

export const changeBoardMemberRoleHandler = asyncHandler(async (req: Request, res: Response) => {
  const membership = await boardService.changeBoardMemberRole(
    req.board!,
    req.params.userId!,
    req.body,
  );
  res.json(membership);
});

export const removeBoardMemberHandler = asyncHandler(async (req: Request, res: Response) => {
  await boardService.removeBoardMember(req.board!, req.params.userId!);
  res.status(204).end();
});

export const archiveBoardHandler = asyncHandler(async (req: Request, res: Response) => {
  const board = await boardService.archiveBoard(req.board!);
  res.json(board);
});

export const restoreBoardHandler = asyncHandler(async (req: Request, res: Response) => {
  const board = await boardService.restoreBoard(req.board!);
  res.json(board);
});

export const deleteBoardHandler = asyncHandler(async (req: Request, res: Response) => {
  await boardService.deleteBoard(req.board!, req.body);
  res.status(204).end();
});

export const updateBoardBackgroundHandler = asyncHandler(async (req: Request, res: Response) => {
  const board = await boardService.updateBoardBackground(req.board!, req.body);
  res.json(board);
});
