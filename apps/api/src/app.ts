import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { passport } from './lib/passport.js';
import { attachmentsRouter } from './routes/attachments.js';
import { authRouter } from './routes/auth.js';
import { boardsRouter } from './routes/boards.js';
import { cardsRouter } from './routes/cards.js';
import { checklistItemsRouter } from './routes/checklist-items.js';
import { checklistsRouter } from './routes/checklists.js';
import { commentsRouter } from './routes/comments.js';
import { healthRouter } from './routes/health.js';
import { labelsRouter } from './routes/labels.js';
import { listsRouter } from './routes/lists.js';
import { notificationsRouter } from './routes/notifications.js';
import { usersRouter } from './routes/users.js';
import { workspacesRouter } from './routes/workspaces.js';

export function createApp() {
  const app = express();

  // Explicit non-wildcard origin: required for credentialed cross-origin requests
  // (Architecture §7.1) — wildcard + credentials:true is rejected by browsers anyway.
  app.use(cors({ credentials: true, origin: process.env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/workspaces', workspacesRouter);
  app.use('/boards', boardsRouter);
  app.use('/lists', listsRouter);
  app.use('/cards', cardsRouter);
  app.use('/labels', labelsRouter);
  app.use('/checklists', checklistsRouter);
  app.use('/checklist-items', checklistItemsRouter);
  app.use('/comments', commentsRouter);
  app.use('/attachments', attachmentsRouter);
  app.use('/notifications', notificationsRouter);

  app.use(errorHandler);

  return app;
}
