import { z } from 'zod';

import { userProfileSchema } from './user.js';

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

// Story 4.5 (FR26): powers the Card assignee picker (needs to know who's
// assignable) — an explicit BoardMember row's user profile plus their role.
// Scoped to explicit rows only, same set Story 2.5/2.6's invite/role-change
// endpoints operate on; a Workspace Owner's implicit Board access
// (Architecture §7.4) has no BoardMember row and so doesn't appear here.
export const boardMemberSchema = z.object({
  userId: z.string().uuid(),
  role: boardRoleSchema,
  user: userProfileSchema,
});

export type BoardMember = z.infer<typeof boardMemberSchema>;

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
