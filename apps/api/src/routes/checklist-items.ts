import { moveChecklistItemRequestSchema, updateChecklistItemRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import {
  deleteChecklistItemHandler,
  moveChecklistItemHandler,
  updateChecklistItemHandler,
} from '../controllers/checklist-item.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadChecklistItemContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const checklistItemsRouter = Router();

checklistItemsRouter.use(authenticate);
checklistItemsRouter.use('/:itemId', loadChecklistItemContext);

// FR27: requireRole('MEMBER') on every route below, same gate as every other
// Card-content mutation.
checklistItemsRouter.patch(
  '/:itemId',
  requireRole('MEMBER'),
  validateBody(updateChecklistItemRequestSchema),
  updateChecklistItemHandler,
);
checklistItemsRouter.delete('/:itemId', requireRole('MEMBER'), deleteChecklistItemHandler);
checklistItemsRouter.post(
  '/:itemId/move',
  requireRole('MEMBER'),
  validateBody(moveChecklistItemRequestSchema),
  moveChecklistItemHandler,
);
