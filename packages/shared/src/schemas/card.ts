import { z } from 'zod';

export const createCardRequestSchema = z.object({
  title: z.string().min(1),
});

export type CreateCardRequest = z.infer<typeof createCardRequestSchema>;

export const cardSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  startDate: z.coerce.date().nullable(),
  dueDate: z.coerce.date().nullable(),
  isArchived: z.boolean(),
});

export type Card = z.infer<typeof cardSchema>;
