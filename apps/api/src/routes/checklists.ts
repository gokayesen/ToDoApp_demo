import { createChecklistItemRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import { createChecklistItemHandler } from '../controllers/checklist-item.controller.js';
import { deleteChecklistHandler } from '../controllers/checklist.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadChecklistContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const checklistsRouter = Router();

checklistsRouter.use(authenticate);
checklistsRouter.use('/:checklistId', loadChecklistContext);

// FR27: requireRole('MEMBER') on every route below, same gate as every other
// Card-content mutation (labels, assignees, dates).
checklistsRouter.delete('/:checklistId', requireRole('MEMBER'), deleteChecklistHandler);
checklistsRouter.post(
  '/:checklistId/items',
  requireRole('MEMBER'),
  validateBody(createChecklistItemRequestSchema),
  createChecklistItemHandler,
);
