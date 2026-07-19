import { z } from 'zod';

export const createCardRequestSchema = z.object({
  title: z.string().min(1),
});

export type CreateCardRequest = z.infer<typeof createCardRequestSchema>;

// Architecture §4 "Ordering strategy": same target-neighbor intent as
// moveListRequestSchema, plus the target listId since a Card move can cross
// Lists (never a client-submitted position; the server recomputes it).
export const moveCardRequestSchema = z.object({
  listId: z.string().uuid(),
  afterCardId: z.string().uuid().nullable(),
  beforeCardId: z.string().uuid().nullable(),
});

export type MoveCardRequest = z.infer<typeof moveCardRequestSchema>;

export const cardSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  startDate: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  isArchived: z.boolean(),
  archivedWithList: z.boolean(),
});

export type Card = z.infer<typeof cardSchema>;
