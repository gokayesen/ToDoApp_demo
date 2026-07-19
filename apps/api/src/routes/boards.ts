import { inviteBoardMemberRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import { inviteBoardMemberHandler } from '../controllers/board.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadBoardContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const boardsRouter = Router();

boardsRouter.use(authenticate);

boardsRouter.post(
  '/:boardId/invites',
  loadBoardContext,
  requireRole('ADMIN'),
  validateBody(inviteBoardMemberRequestSchema),
  inviteBoardMemberHandler,
);
