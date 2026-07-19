import type { Board, CreateBoardRequest, CreateWorkspaceRequest, Workspace } from '@todoapp/shared';

import { apiFetch } from './api-client';

export function listWorkspaces() {
  return apiFetch<Workspace[]>('/workspaces');
}

export function createWorkspace(input: CreateWorkspaceRequest) {
  return apiFetch<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(input) });
}

export function listBoards(workspaceId: string) {
  return apiFetch<Board[]>(`/workspaces/${workspaceId}/boards`);
}

export function createBoard(workspaceId: string, input: CreateBoardRequest) {
  return apiFetch<Board>(`/workspaces/${workspaceId}/boards`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
