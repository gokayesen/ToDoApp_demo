import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import { REFRESH_COOKIE_NAME } from './auth.controller.js';
import * as userService from '../services/user.service.js';

function toUserProfile(user: { id: string; email: string; name: string; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

export const getMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getProfile(req.userId!);
  res.json(toUserProfile(user));
});

export const updateMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(req.userId!, req.body);
  res.json(toUserProfile(user));
});

// Story 8.8 (FR40): lets the client render the ownership-transfer prompt
// before the user ever attempts deletion (Architecture §10's flagged UX gap).
export const listOwnedWorkspacesHandler = asyncHandler(async (req: Request, res: Response) => {
  const workspaces = await userService.listOwnedWorkspaces(req.userId!);
  res.json(workspaces);
});

// Clears the same refresh cookie logoutHandler does — the RefreshToken rows
// backing it are already gone the instant the User row cascades, so this is
// tidiness for the browser rather than a security-critical step.
export const deleteMeHandler = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteAccount(req.userId!, req.body);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
  res.status(204).end();
});
