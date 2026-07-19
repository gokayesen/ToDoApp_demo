import { z } from 'zod';

export const createBoardRequestSchema = z.object({
  name: z.string().min(1),
});

export type CreateBoardRequest = z.infer<typeof createBoardRequestSchema>;

export const boardSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  background: z.string().nullable(),
  isArchived: z.boolean(),
});

export type Board = z.infer<typeof boardSchema>;

export const boardRoleSchema = z.enum(['ADMIN', 'MEMBER', 'VIEWER']);

export const inviteBoardMemberRequestSchema = z.object({
  email: z.string().email(),
  role: boardRoleSchema,
});

export type InviteBoardMemberRequest = z.infer<typeof inviteBoardMemberRequestSchema>;

export const updateBoardMemberRoleRequestSchema = z.object({
  role: boardRoleSchema,
});

export type UpdateBoardMemberRoleRequest = z.infer<typeof updateBoardMemberRoleRequestSchema>;

// FR12's "confirmation step": the caller must echo the board's current name
// back, the same type-to-confirm pattern used for other irreversible deletes.
export const deleteBoardRequestSchema = z.object({
  confirmName: z.string().min(1),
});

export type DeleteBoardRequest = z.infer<typeof deleteBoardRequestSchema>;

// FR13: a solid color (hex/CSS value) or an image URL — both are just opaque
// strings to the API, rendered by the client. null clears back to the
// default background.
export const updateBoardBackgroundRequestSchema = z.object({
  background: z.string().min(1).max(2048).nullable(),
});

export type UpdateBoardBackgroundRequest = z.infer<typeof updateBoardBackgroundRequestSchema>;
