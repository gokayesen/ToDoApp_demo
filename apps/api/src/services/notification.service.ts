import type { UpdateNotificationPreferenceRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import {
  createNotification,
  findNotificationById,
  findNotificationsByUser,
  findPreference,
  findPreferencesByUser,
  markAllNotificationsRead,
  markNotificationRead,
  upsertPreference,
} from '../repositories/notification.repository.js';

export function listNotifications(userId: string) {
  return findNotificationsByUser(userId);
}

// Story 6.3 (FR34): the four triggers this story wires up. `type` doubles as
// the NotificationPreference `eventType` key (Story 6.1) — a user who has
// turned inAppEnabled off for one of these skips creation entirely rather
// than being written and hidden, since there's no unread-but-suppressed
// concept anywhere else in the app. A missing preference row means enabled,
// same "defaults enabled" contract Story 6.1 established.
export type NotificationEventType =
  | 'card.assigned'
  | 'comment.mention'
  | 'workspace.added'
  | 'board.added'
  | 'card.due_soon'
  | 'card.overdue';

export async function notifyUser(
  userId: string,
  type: NotificationEventType,
  payload: { message: string; boardId?: string },
): Promise<void> {
  const preference = await findPreference(userId, type);
  if (preference && !preference.inAppEnabled) return;
  await createNotification(userId, type, payload);
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
