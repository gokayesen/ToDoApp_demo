import { z } from 'zod';

export const createListRequestSchema = z.object({
  name: z.string().min(1),
});

export type CreateListRequest = z.infer<typeof createListRequestSchema>;

export const renameListRequestSchema = z.object({
  name: z.string().min(1),
});

export type RenameListRequest = z.infer<typeof renameListRequestSchema>;

// Architecture §4 "Ordering strategy": a target-neighbor intent, never a raw
// position value — the server re-reads the neighbors' current positions and
// computes the final one (Story 3.2's engine). null means start/end-of-board.
export const moveListRequestSchema = z.object({
  afterListId: z.string().uuid().nullable(),
  beforeListId: z.string().uuid().nullable(),
});

export type MoveListRequest = z.infer<typeof moveListRequestSchema>;

export const listSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string(),
  position: z.number(),
  isArchived: z.boolean(),
});

export type List = z.infer<typeof listSchema>;
