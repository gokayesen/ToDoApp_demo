import { z } from 'zod';

import { labelSchema } from './label.js';

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

// FR18: title and markdown description, both independently optional so the
// same endpoint serves either field's inline-edit save (Story 4.2) without
// forcing the caller to resend the one it isn't touching.
export const updateCardRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>;

// FR24: attach a Board Label to a Card. Detach takes the labelId as a route
// param instead (DELETE /cards/:cardId/labels/:labelId), no body needed.
export const attachCardLabelRequestSchema = z.object({
  labelId: z.string().uuid(),
});

export type AttachCardLabelRequest = z.infer<typeof attachCardLabelRequestSchema>;

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
  // Story 4.3 (FR24): always present (possibly empty), never omitted — every
  // backend Card query includes+flattens the CardLabel join so this field is
  // consistent whichever endpoint returned the Card (see card.repository.ts).
  labels: z.array(labelSchema),
});

export type Card = z.infer<typeof cardSchema>;
