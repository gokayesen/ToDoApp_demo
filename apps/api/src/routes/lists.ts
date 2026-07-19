import { createCardRequestSchema, renameListRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import { createCardHandler, listCardsHandler } from '../controllers/card.controller.js';
import { deleteListHandler, renameListHandler } from '../controllers/list.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadListContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const listsRouter = Router();

listsRouter.use(authenticate);
listsRouter.use('/:listId', loadListContext);

// FR14: rename/delete a List.
listsRouter.patch(
  '/:listId',
  requireRole('MEMBER'),
  validateBody(renameListRequestSchema),
  renameListHandler,
);
listsRouter.delete('/:listId', requireRole('MEMBER'), deleteListHandler);

// FR17: Card creation is list-scoped, same nested-under-parent convention as
// List creation under /boards/:boardId/lists.
listsRouter.post(
  '/:listId/cards',
  requireRole('MEMBER'),
  validateBody(createCardRequestSchema),
  createCardHandler,
);
listsRouter.get('/:listId/cards', requireRole('VIEWER'), listCardsHandler);
