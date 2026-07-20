import { z } from 'zod';

// Story 6.1 (FR34/FR36): `type` is a plain string, not an enum like
// ActivityLog.type — no story writes a Notification row yet (the concrete
// trigger set is Story 6.3's job), so enumerating values with zero producers
// here would be speculative. `payload` is freeform JSON shaped per type, same
// convention as ActivityLog.metadata.
export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  isRead: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

// FR35/FR36 preface: `eventType` is likewise a plain string — its concrete
// values are defined by whatever Story 6.3 actually fires, not by this story.
export const notificationPreferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  eventType: z.string(),
  emailEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
});

export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

// A missing row for a given eventType means "defaults enabled" (see
// schema.prisma's NotificationPreference comment), so PATCH always names the
// eventType it wants to set/override and upserts the row.
export const updateNotificationPreferenceRequestSchema = z.object({
  eventType: z.string().min(1),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferenceRequest = z.infer<
  typeof updateNotificationPreferenceRequestSchema
>;
