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
