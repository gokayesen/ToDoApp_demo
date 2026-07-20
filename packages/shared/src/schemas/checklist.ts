import { z } from 'zod';

export const checklistItemSchema = z.object({
  id: z.string().uuid(),
  checklistId: z.string().uuid(),
  text: z.string(),
  isChecked: z.boolean(),
  position: z.number(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const checklistSchema = z.object({
  id: z.string().uuid(),
  cardId: z.string().uuid(),
  title: z.string(),
  position: z.number(),
  items: z.array(checklistItemSchema),
});

export type Checklist = z.infer<typeof checklistSchema>;

export const createChecklistRequestSchema = z.object({
  title: z.string().min(1),
});

export type CreateChecklistRequest = z.infer<typeof createChecklistRequestSchema>;

export const createChecklistItemRequestSchema = z.object({
  text: z.string().min(1),
});

export type CreateChecklistItemRequest = z.infer<typeof createChecklistItemRequestSchema>;

// text and isChecked are both independently optional so the same endpoint
// serves either an inline text edit or a check-toggle without forcing the
// caller to resend the field it isn't touching — same convention as
// updateCardRequestSchema (Story 4.2/4.4).
export const updateChecklistItemRequestSchema = z.object({
  text: z.string().min(1).optional(),
  isChecked: z.boolean().optional(),
});

export type UpdateChecklistItemRequest = z.infer<typeof updateChecklistItemRequestSchema>;

// Same target-neighbor intent as moveCardRequestSchema/moveListRequestSchema
// — the server recomputes the final position from live neighbors, never a
// client-submitted value (Architecture §4).
export const moveChecklistItemRequestSchema = z.object({
  afterItemId: z.string().uuid().nullable(),
  beforeItemId: z.string().uuid().nullable(),
});

export type MoveChecklistItemRequest = z.infer<typeof moveChecklistItemRequestSchema>;
