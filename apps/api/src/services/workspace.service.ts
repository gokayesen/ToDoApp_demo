import type { CreateWorkspaceRequest } from '@todoapp/shared';

import {
  createWorkspaceWithOwner,
  listWorkspacesForUser,
} from '../repositories/workspace.repository.js';

export function createWorkspace(userId: string, input: CreateWorkspaceRequest) {
  return createWorkspaceWithOwner(input.name, userId);
}

export function listWorkspaces(userId: string) {
  return listWorkspacesForUser(userId);
}
