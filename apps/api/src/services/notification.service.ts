import type { UpdateNotificationPreferenceRequest } from '@todoapp/shared';

import { sendNotificationEmail } from '../lib/email.js';
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
import { findUserById } from '../repositories/user.repository.js';

export function listNotifications(userId: string) {
  return findNotificationsByUser(userId);
}

// Story 6.3 (FR34) / Story 6.4: the six triggers wired up so far. `type`
// doubles as the NotificationPreference `eventType` key (Story 6.1) — a user
// who has turned inAppEnabled off for one of these skips row creation
// entirely rather than being written and hidden, since there's no
// unread-but-suppressed concept anywhere else in the app. A missing
// preference row means both flags are enabled, same "defaults enabled"
// contract Story 6.1 established.
export type NotificationEventType =
  | 'card.assigned'
  | 'comment.mention'
  | 'workspace.added'
  | 'board.added'
  | 'card.due_soon'
  | 'card.overdue';

// Story 6.5 (FR35): subject/heading/CTA copy per event type — the body
// itself is always just payload.message (already a complete human-readable
// sentence at every call site), so there's nothing type-specific left to
// generate there. No case has a boardId-less ctaUrl fall through to a
// broken link: workspace.added is the only type that never sets
// payload.boardId (see notifyUser's callers), and its content below simply
// omits ctaLabel to match.
function buildEmailContent(type: NotificationEventType): { subject: string; heading: string; ctaLabel?: string } {
  switch (type) {
    case 'card.assigned':
      return { subject: 'You were assigned a card', heading: 'New card assignment', ctaLabel: 'View card' };
    case 'comment.mention':
      return { subject: 'You were mentioned in a comment', heading: 'New mention', ctaLabel: 'View card' };
    case 'workspace.added':
      return { subject: "You've been added to a workspace", heading: 'Added to workspace' };
    case 'board.added':
      return { subject: "You've been added to a board", heading: 'Added to board', ctaLabel: 'View board' };
    case 'card.due_soon':
      return { subject: 'A card is due soon', heading: 'Due soon', ctaLabel: 'View card' };
    case 'card.overdue':
      return { subject: 'A card is overdue', heading: 'Overdue', ctaLabel: 'View card' };
  }
}

function buildCtaUrl(boardId: string | undefined): string | undefined {
  if (!boardId) return undefined;
  const base = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  return new URL(`/boards/${boardId}`, base).toString();
}

// inAppEnabled and emailEnabled are independent flags (packages/shared's
// NotificationPreference), so this checks each separately rather than
// treating a preference row as one on/off switch — a user can want the
// email without the in-app row, or vice versa.
export async function notifyUser(
  userId: string,
  type: NotificationEventType,
  payload: { message: string; boardId?: string },
): Promise<void> {
  const preference = await findPreference(userId, type);

  if (!preference || preference.inAppEnabled) {
    await createNotification(userId, type, payload);
  }

  if (!preference || preference.emailEnabled) {
    const user = await findUserById(userId);
    if (user) {
      const { subject, heading, ctaLabel } = buildEmailContent(type);
      await sendNotificationEmail(user.email, subject, {
        heading,
        message: payload.message,
        ctaUrl: buildCtaUrl(payload.boardId),
        ctaLabel,
      });
    }
  }
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
