import { deleteAccountRequestSchema, updateProfileRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import {
  deleteMeHandler,
  getMeHandler,
  listOwnedWorkspacesHandler,
  updateMeHandler,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/me', getMeHandler);
usersRouter.patch('/me', validateBody(updateProfileRequestSchema), updateMeHandler);
// Story 8.8 (FR40): read the Workspace-ownership-transfer decisions this
// account's deletion will need before ever attempting DELETE /me.
usersRouter.get('/me/owned-workspaces', listOwnedWorkspacesHandler);
usersRouter.delete('/me', validateBody(deleteAccountRequestSchema), deleteMeHandler);
