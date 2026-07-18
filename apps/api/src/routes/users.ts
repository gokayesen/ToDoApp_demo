import { updateProfileRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import { getMeHandler, updateMeHandler } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get('/me', getMeHandler);
usersRouter.patch('/me', validateBody(updateProfileRequestSchema), updateMeHandler);
