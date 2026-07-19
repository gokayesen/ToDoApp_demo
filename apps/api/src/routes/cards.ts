import { moveCardRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import {
  archiveCardHandler,
  deleteCardHandler,
  moveCardHandler,
  restoreCardHandler,
} from '../controllers/card.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadCardContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';
import { validateBody } from '../middleware/validate.js';

export const cardsRouter = Router();

cardsRouter.use(authenticate);
cardsRouter.use('/:cardId', loadCardContext);

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
