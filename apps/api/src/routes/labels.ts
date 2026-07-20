import { updateLabelRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import { deleteLabelHandler, updateLabelHandler } from '../controllers/label.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadLabelContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const labelsRouter = Router();

labelsRouter.use(authenticate);
labelsRouter.use('/:labelId', loadLabelContext);

// FR24: rename/recolor and delete a Label. ADMIN-gated — see label.service.ts.
labelsRouter.patch(
  '/:labelId',
  requireRole('ADMIN'),
  validateBody(updateLabelRequestSchema),
  updateLabelHandler,
);
labelsRouter.delete('/:labelId', requireRole('ADMIN'), deleteLabelHandler);
