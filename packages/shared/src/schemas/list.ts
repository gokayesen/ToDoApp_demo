import { z } from 'zod';

export const createListRequestSchema = z.object({
  name: z.string().min(1),
});

export type CreateListRequest = z.infer<typeof createListRequestSchema>;

export const renameListRequestSchema = z.object({
  name: z.string().min(1),
});

export type RenameListRequest = z.infer<typeof renameListRequestSchema>;

export const listSchema = z.object({
  id: z.string().uuid(),
  boardId: z.string().uuid(),
  name: z.string(),
  position: z.number(),
  isArchived: z.boolean(),
});

export type List = z.infer<typeof listSchema>;
