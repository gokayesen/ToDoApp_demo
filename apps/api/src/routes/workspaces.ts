import {
  createBoardRequestSchema,
  createWorkspaceRequestSchema,
  inviteWorkspaceMemberRequestSchema,
} from '@todoapp/shared';
import { Router } from 'express';

import { createBoardHandler } from '../controllers/board.controller.js';
import {
  createWorkspaceHandler,
  inviteWorkspaceMemberHandler,
  listWorkspacesHandler,
} from '../controllers/workspace.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.post('/', validateBody(createWorkspaceRequestSchema), createWorkspaceHandler);
workspacesRouter.get('/', listWorkspacesHandler);
workspacesRouter.post(
  '/:workspaceId/invites',
  validateBody(inviteWorkspaceMemberRequestSchema),
  inviteWorkspaceMemberHandler,
);
workspacesRouter.post(
  '/:workspaceId/boards',
  validateBody(createBoardRequestSchema),
  createBoardHandler,
);
