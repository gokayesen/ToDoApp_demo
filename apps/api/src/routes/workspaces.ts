import { createWorkspaceRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import { createWorkspaceHandler, listWorkspacesHandler } from '../controllers/workspace.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.post('/', validateBody(createWorkspaceRequestSchema), createWorkspaceHandler);
workspacesRouter.get('/', listWorkspacesHandler);
