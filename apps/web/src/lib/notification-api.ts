import type {
  Notification,
  NotificationPreference,
  UpdateNotificationPreferenceRequest,
} from '@todoapp/shared';

import { apiFetch } from './api-client';

export function listNotifications() {
  return apiFetch<Notification[]>('/notifications');
}

export function markNotificationRead(notificationId: string) {
  return apiFetch<Notification>(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return apiFetch<Notification[]>('/notifications/read-all', { method: 'PATCH' });
}

export function listNotificationPreferences() {
  return apiFetch<NotificationPreference[]>('/notifications/preferences');
}

export function updateNotificationPreference(input: UpdateNotificationPreferenceRequest) {
  return apiFetch<NotificationPreference>('/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
