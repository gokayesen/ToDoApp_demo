import { loginRequestSchema, registerRequestSchema } from '@todoapp/shared';
import { Router } from 'express';

import { loginHandler, refreshHandler, registerHandler } from '../controllers/auth.controller.js';
import { authRateLimiter } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/register', validateBody(registerRequestSchema), registerHandler);
authRouter.post('/login', validateBody(loginRequestSchema), loginHandler);
authRouter.post('/refresh', refreshHandler);
