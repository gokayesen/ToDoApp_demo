import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
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
