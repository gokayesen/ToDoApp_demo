import {
  assignCardRequestSchema,
  attachCardLabelRequestSchema,
  createAttachmentRequestSchema,
  createChecklistRequestSchema,
  createCommentRequestSchema,
  moveCardRequestSchema,
  presignAttachmentRequestSchema,
  updateCardRequestSchema,
} from '@todoapp/shared';
import { Router } from 'express';

import {
  createAttachmentHandler,
  presignAttachmentHandler,
} from '../controllers/attachment.controller.js';
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
import { createCommentHandler } from '../controllers/comment.controller.js';
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

// FR28: create a Comment on this Card. Same nested-under-parent convention as
// Checklist creation above; deletion lives under /comments instead
// (routes/comments.ts) since it needs the extra author-or-admin check.
cardsRouter.post(
  '/:cardId/comments',
  requireRole('MEMBER'),
  validateBody(createCommentRequestSchema),
  createCommentHandler,
);

// FR29: direct-to-R2 upload flow (Architecture §3/§9) — presign issues a
// short-lived PUT URL for the client to upload straight to R2, then a second
// call records the resulting object as an Attachment once that upload
// succeeds. Deletion lives under /attachments instead (routes/attachments.ts)
// since it needs the extra uploader-or-admin check, same split comments.ts
// uses.
cardsRouter.post(
  '/:cardId/attachments/presign',
  requireRole('MEMBER'),
  validateBody(presignAttachmentRequestSchema),
  presignAttachmentHandler,
);
cardsRouter.post(
  '/:cardId/attachments',
  requireRole('MEMBER'),
  validateBody(createAttachmentRequestSchema),
  createAttachmentHandler,
);
