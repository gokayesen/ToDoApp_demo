import type { DeleteAccountRequest, OwnedWorkspace } from '@todoapp/shared';

import { apiFetch } from './api-client';

// Story 8.8 (FR40): read before ever attempting deletion, so the client can
// render the ownership-transfer prompt Architecture §10 flags as needed.
export function listOwnedWorkspaces() {
  return apiFetch<OwnedWorkspace[]>('/users/me/owned-workspaces');
}

export function deleteAccount(input: DeleteAccountRequest) {
  return apiFetch<void>('/users/me', { method: 'DELETE', body: JSON.stringify(input) });
}
