import {
  assignCardRequestSchema,
  attachCardLabelRequestSchema,
  createChecklistRequestSchema,
  moveCardRequestSchema,
  updateCardRequestSchema,
} from '@todoapp/shared';
import { Router } from 'express';

import {
  archiveCardHandler,
  assignUserHandler,
  attachLabelHandler,
  deleteCardHandler,
  detachLabelHandler,
  moveCardHandler,
  restoreCardHandler,
  unassignUserHandler,
  updateCardHandler,
} from '../controllers/card.controller.js';
import { createChecklistHandler } from '../controllers/checklist.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadCardContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const cardsRouter = Router();

cardsRouter.use(authenticate);
cardsRouter.use('/:cardId', loadCardContext);

cardsRouter.patch(
  '/:cardId',
  requireRole('MEMBER'),
  validateBody(updateCardRequestSchema),
  updateCardHandler,
);
cardsRouter.delete('/:cardId', requireRole('MEMBER'), deleteCardHandler);
cardsRouter.post(
  '/:cardId/move',
  requireRole('MEMBER'),
  validateBody(moveCardRequestSchema),
  moveCardHandler,
);
// FR21: "Board members can archive and restore Cards" — same MEMBER gate as
// every other Card mutation above.
cardsRouter.post('/:cardId/archive', requireRole('MEMBER'), archiveCardHandler);
cardsRouter.post('/:cardId/restore', requireRole('MEMBER'), restoreCardHandler);

// FR24: attach/remove a Label on a Card. MEMBER-gated like every other Card
// mutation above — distinct from the Label taxonomy's own ADMIN-gated CRUD
// mounted under /boards/:boardId/labels and /labels/:labelId.
cardsRouter.post(
  '/:cardId/labels',
  requireRole('MEMBER'),
  validateBody(attachCardLabelRequestSchema),
  attachLabelHandler,
);
cardsRouter.delete('/:cardId/labels/:labelId', requireRole('MEMBER'), detachLabelHandler);

// FR26: assign/unassign a Board Member on a Card. Same MEMBER gate as every
// other Card mutation above.
cardsRouter.post(
  '/:cardId/assignees',
  requireRole('MEMBER'),
  validateBody(assignCardRequestSchema),
  assignUserHandler,
);
cardsRouter.delete('/:cardId/assignees/:userId', requireRole('MEMBER'), unassignUserHandler);

// FR27: create a Checklist on this Card. Same nested-under-parent convention
// as List creation under /boards/:boardId/lists — item-level mutations and
// checklist deletion live under /checklists and /checklist-items instead
// (routes/checklists.ts, routes/checklist-items.ts), same split labels.ts
// uses for Label rename/delete vs. attach/detach here.
cardsRouter.post(
  '/:cardId/checklists',
  requireRole('MEMBER'),
  validateBody(createChecklistRequestSchema),
  createChecklistHandler,
);
