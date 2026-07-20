import { Router } from 'express';

import { deleteCommentHandler } from '../controllers/comment.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loadCommentContext } from '../middleware/load-resource-context.js';
import { requireRole } from '../middleware/require-role.js';

export const commentsRouter = Router();

commentsRouter.use(authenticate);
commentsRouter.use('/:commentId', loadCommentContext);

// FR28: requireRole('MEMBER') is the baseline gate (excludes Viewers); the
// finer author-or-admin check lives in comment.service.ts deleteComment.
commentsRouter.delete('/:commentId', requireRole('MEMBER'), deleteCommentHandler);
