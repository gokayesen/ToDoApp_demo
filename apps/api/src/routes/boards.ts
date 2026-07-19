import {
  deleteBoardRequestSchema,
  inviteBoardMemberRequestSchema,
  updateBoardBackgroundRequestSchema,
  updateBoardMemberRoleRequestSchema,
} from '@todoapp/shared';
import { Router } from 'express';

import {
  archiveBoardHandler,
  changeBoardMemberRoleHandler,
  deleteBoardHandler,
  inviteBoardMemberHandler,
  removeBoardMemberHandler,
  restoreBoardHandler,
  updateBoardBackgroundHandler,
} from '../controllers/board.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadBoardContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const boardsRouter = Router();

boardsRouter.use(authenticate);
boardsRouter.use('/:boardId', loadBoardContext);

boardsRouter.post(
  '/:boardId/invites',
  requireRole('ADMIN'),
  validateBody(inviteBoardMemberRequestSchema),
  inviteBoardMemberHandler,
);
boardsRouter.patch(
  '/:boardId/members/:userId',
  requireRole('ADMIN'),
  validateBody(updateBoardMemberRoleRequestSchema),
  changeBoardMemberRoleHandler,
);
boardsRouter.delete('/:boardId/members/:userId', requireRole('ADMIN'), removeBoardMemberHandler);
boardsRouter.post('/:boardId/archive', requireRole('ADMIN'), archiveBoardHandler);
boardsRouter.post('/:boardId/restore', requireRole('ADMIN'), restoreBoardHandler);
boardsRouter.delete(
  '/:boardId',
  requireRole('ADMIN'),
  validateBody(deleteBoardRequestSchema),
  deleteBoardHandler,
);
boardsRouter.patch(
  '/:boardId/background',
  requireRole('ADMIN'),
  validateBody(updateBoardBackgroundRequestSchema),
  updateBoardBackgroundHandler,
);
