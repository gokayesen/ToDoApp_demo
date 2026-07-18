import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as workspaceService from '../services/workspace.service.js';

export const createWorkspaceHandler = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.createWorkspace(req.userId!, req.body);
  res.status(201).json(workspace);
});

export const listWorkspacesHandler = asyncHandler(async (req: Request, res: Response) => {
  const workspaces = await workspaceService.listWorkspaces(req.userId!);
  res.json(workspaces);
});
