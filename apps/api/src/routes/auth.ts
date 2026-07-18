import { loginRequestSchema, registerRequestSchema } from '@todoapp/shared';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import {
  googleCallbackHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from '../controllers/auth.controller.js';
import { isGoogleOAuthConfigured, passport } from '../lib/passport.js';
import { authRateLimiter } from '../middleware/rate-limit.js';
import { validateBody } from '../middleware/validate.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/register', validateBody(registerRequestSchema), registerHandler);
authRouter.post('/login', validateBody(loginRequestSchema), loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);

function requireGoogleOAuthConfigured(_req: Request, res: Response, next: NextFunction) {
  if (!isGoogleOAuthConfigured) {
    res.status(503).json({ error: 'Google OAuth is not configured on this server' });
    return;
  }
  next();
}

authRouter.get(
  '/google',
  requireGoogleOAuthConfigured,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);
authRouter.get(
  '/google/callback',
  requireGoogleOAuthConfigured,
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CORS_ORIGIN ?? 'http://localhost:3000'}/login?error=oauth_failed`,
  }),
  googleCallbackHandler,
);
