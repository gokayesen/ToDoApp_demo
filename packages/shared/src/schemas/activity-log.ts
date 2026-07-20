import { z } from 'zod';

// Story 4.9 (FR30): fixed set of system-generated event types, each with its
// own metadata shape (validated only at this Zod boundary, not a DB enum —
// same choice Label.color made). Intentionally scoped to the Card-content
// mutations this story instruments; board/workspace-level activity (e.g.
// membership changes) has no writer yet even though the ActivityLog model
// itself supports a null cardId for it later (see schema.prisma's comment).
export const activityTypeSchema = z.enum([
  'card.moved',
  'card.renamed',
  'card.description_updated',
  'card.archived',
  'card.restored',
  'card.due_date_changed',
  'card.start_date_changed',
  'label.attached',
  'label.detached',
  'assignee.added',
  'assignee.removed',
  'checklist.created',
  'checklist.deleted',
  'attachment.added',
  'attachment.removed',
]);

export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityLogEntrySchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  cardId: z.string().uuid().nullable(),
  userId: z.string().uuid().nullable(),
  actorNameSnapshot: z.string(),
  type: activityTypeSchema,
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.coerce.date(),
});

export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;
