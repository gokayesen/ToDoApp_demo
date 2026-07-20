import { Router } from 'express';

import { deleteAttachmentHandler } from '../controllers/attachment.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadAttachmentContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';

export const attachmentsRouter = Router();

attachmentsRouter.use(authenticate);
attachmentsRouter.use('/:attachmentId', loadAttachmentContext);

// FR29: requireRole('MEMBER') is the baseline gate (excludes Viewers); the
// finer uploader-or-admin check lives in attachment.service.ts deleteAttachment
// — same pattern as comments.ts/comment.service.ts.
attachmentsRouter.delete('/:attachmentId', requireRole('MEMBER'), deleteAttachmentHandler);
