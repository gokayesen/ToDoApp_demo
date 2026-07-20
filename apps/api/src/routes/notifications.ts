import { updateNotificationPreferenceRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import {
  listNotificationsHandler,
  listPreferencesHandler,
  markAllReadHandler,
  markReadHandler,
  updatePreferenceHandler,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', listNotificationsHandler);
notificationsRouter.patch('/read-all', markAllReadHandler);
notificationsRouter.patch('/:notificationId/read', markReadHandler);
notificationsRouter.get('/preferences', listPreferencesHandler);
notificationsRouter.patch(
  '/preferences',
  validateBody(updateNotificationPreferenceRequestSchema),
  updatePreferenceHandler,
);
