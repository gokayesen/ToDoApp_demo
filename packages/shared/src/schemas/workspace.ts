import { z } from 'zod';

export const createWorkspaceRequestSchema = z.object({
  name: z.string().min(1),
});

export type CreateWorkspaceRequest = z.infer<typeof createWorkspaceRequestSchema>;

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
});

export type Workspace = z.infer<typeof workspaceSchema>;
