import { z } from 'zod';

// FR28: userId is nullable — a Comment survives its author's account being
// deleted (Architecture §4 cascade table: SetNull, not Cascade), with
// authorNameSnapshot preserving who wrote it. `body` may contain `@Full Name`
// mention text (a plain-text convention, not a structured reference — see
// schema.prisma's Comment model comment).
export const commentSchema = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  authorNameSnapshot: z.string(),
  body: z.string(),
  createdAt: z.coerce.date(),
});

export type Comment = z.infer<typeof commentSchema>;

export const createCommentRequestSchema = z.object({
  body: z.string().min(1),
});

export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;
