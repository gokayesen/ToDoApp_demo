import { z } from 'zod';

import { labelSchema } from './label.js';
import { userProfileSchema } from './user.js';

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

// FR18/FR25: title, description, startDate, dueDate are all independently
// optional so the same endpoint serves any single field's inline-edit save
// (Story 4.2, Story 4.4) without forcing the caller to resend fields it isn't
// touching. startDate/dueDate are nullable to allow clearing a previously-set
// date.
export const updateCardRequestSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .refine((data) => !data.startDate || !data.dueDate || data.startDate <= data.dueDate, {
    message: 'startDate must not be after dueDate',
    path: ['startDate'],
  });

export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>;

// FR24: attach a Board Label to a Card. Detach takes the labelId as a route
// param instead (DELETE /cards/:cardId/labels/:labelId), no body needed.
export const attachCardLabelRequestSchema = z.object({
  labelId: z.string().uuid(),
});

export type AttachCardLabelRequest = z.infer<typeof attachCardLabelRequestSchema>;

// FR26: assign a Board Member to a Card. Unassign takes the userId as a route
// param instead (DELETE /cards/:cardId/assignees/:userId), same convention as
// Label attach/detach above.
export const assignCardRequestSchema = z.object({
  userId: z.string().uuid(),
});

export type AssignCardRequest = z.infer<typeof assignCardRequestSchema>;

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
  // Story 4.3 (FR24) / Story 4.5 (FR26): always present (possibly empty),
  // never omitted — every backend Card query includes+flattens the CardLabel/
  // CardAssignee joins so these fields are consistent whichever endpoint
  // returned the Card (see card.repository.ts).
  labels: z.array(labelSchema),
  assignees: z.array(userProfileSchema),
});

export type Card = z.infer<typeof cardSchema>;
