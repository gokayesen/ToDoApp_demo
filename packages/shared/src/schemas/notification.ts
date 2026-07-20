import { z } from 'zod';

// Story 6.1 named this speculative ("no producer existed to justify an enum
// back then"); Story 6.3/6.4 became the producers (card.assigned,
// comment.mention, workspace.added, board.added, card.due_soon,
// card.overdue — apps/api's notification.service.ts NotificationEventType),
// and Story 6.6's settings screen is the first thing that needs a canonical
// list to enumerate, so it's formalized here now, same "string + Zod enum
// validated at this boundary" choice as activityTypeSchema. Client code
// should only ever `import type` this — see [[project-nextjs-shared-barrel-bug]]:
// importing a *value* export from packages/shared into a 'use client'
// component breaks unrelated sibling exports from the whole barrel.
export const notificationEventTypeSchema = z.enum([
  'card.assigned',
  'comment.mention',
  'workspace.added',
  'board.added',
  'card.due_soon',
  'card.overdue',
]);

export type NotificationEventType = z.infer<typeof notificationEventTypeSchema>;

// `payload` stays freeform JSON shaped per type, same convention as
// ActivityLog.metadata.
export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationEventTypeSchema,
  payload: z.record(z.string(), z.unknown()),
  isRead: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const notificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  eventType: notificationEventTypeSchema,
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
});

export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

// A missing row for a given eventType means "defaults enabled" (see
// schema.prisma's NotificationPreference comment), so PATCH always names the
// eventType it wants to set/override and upserts the row.
export const updateNotificationPreferenceRequestSchema = z.object({
  eventType: notificationEventTypeSchema,
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferenceRequest = z.infer<
  typeof updateNotificationPreferenceRequestSchema
>;
