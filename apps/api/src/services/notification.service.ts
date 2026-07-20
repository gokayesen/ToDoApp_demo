import type { UpdateNotificationPreferenceRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import {
  findNotificationById,
  findNotificationsByUser,
  findPreferencesByUser,
  markAllNotificationsRead,
  markNotificationRead,
  upsertPreference,
} from '../repositories/notification.repository.js';

export function listNotifications(userId: string) {
  return findNotificationsByUser(userId);
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await findNotificationById(notificationId);
  if (!notification || notification.userId !== userId) {
    throw new HttpError(404, 'Notification not found');
  }
  return markNotificationRead(notificationId);
}

export async function markAllAsRead(userId: string) {
  await markAllNotificationsRead(userId);
  return findNotificationsByUser(userId);
}

export function listPreferences(userId: string) {
  return findPreferencesByUser(userId);
}

export function updatePreference(userId: string, input: UpdateNotificationPreferenceRequest) {
  const { eventType, ...flags } = input;
  return upsertPreference(userId, eventType, flags);
}
