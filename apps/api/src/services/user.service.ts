import type { UpdateProfileRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { findUserById, updateUserProfile } from '../repositories/user.repository.js';

export async function getProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileRequest) {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return updateUserProfile(userId, input);
}
