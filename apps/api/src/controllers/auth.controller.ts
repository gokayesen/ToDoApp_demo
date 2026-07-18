import type { CookieOptions, Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import { REFRESH_TOKEN_TTL_DAYS } from '../lib/refresh-token.js';
import * as authService from '../services/auth.service.js';

const REFRESH_COOKIE_NAME = 'refresh_token';

// SameSite=None; Secure; HttpOnly — required because web (Vercel) and api (Railway)
// sit on different origins in production (Architecture §7.1). Scoped to /auth since
// only the refresh endpoint needs it.
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/auth',
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

function toUserProfile(user: authService.Session['user']) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

function sendSession(res: Response, session: authService.Session, status = 200) {
  res.cookie(REFRESH_COOKIE_NAME, session.rawRefreshToken, refreshCookieOptions);
  res.status(status).json({ accessToken: session.accessToken, user: toUserProfile(session.user) });
}

export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.register(req.body);
  sendSession(res, session, 201);
});

export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.login(req.body);
  sendSession(res, session);
});

export const refreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  try {
    const session = await authService.refresh(presented);
    sendSession(res, session);
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
    throw err;
  }
});

export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logout(presented);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
  res.status(204).end();
});

export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body);
  res.status(204).end();
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body);
  res.status(204).end();
});

// req.user is the Session object attached by the Passport verify callback
// (session: false, so nothing goes through serializeUser/deserializeUser).
export const googleCallbackHandler = asyncHandler(async (req: Request, res: Response) => {
  const session = req.user as authService.Session;
  res.cookie(REFRESH_COOKIE_NAME, session.rawRefreshToken, refreshCookieOptions);

  const webOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const redirectUrl = new URL('/auth/callback', webOrigin);
  redirectUrl.searchParams.set('accessToken', session.accessToken);
  res.redirect(redirectUrl.toString());
});
