import type { DeleteAccountRequest, OwnedWorkspace, UpdateProfileRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import {
  deleteUserAndTransferWorkspaces,
  findUserById,
  updateUserProfile,
} from '../repositories/user.repository.js';
import { listOwnedWorkspacesWithOtherMembers } from '../repositories/workspace.repository.js';

export async function getProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileRequest) {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  return updateUserProfile(userId, input);
}

export async function listOwnedWorkspaces(userId: string): Promise<OwnedWorkspace[]> {
  const workspaces = await listOwnedWorkspacesWithOtherMembers(userId);
  return workspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    otherMembers: ws.members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
    })),
  }));
}

// Story 8.8 (FR40): confirmEmail is the same "type the exact name/email to
// confirm" pattern board.service.ts's deleteBoard already established for an
// irreversible delete — cheap to verify server-side, doesn't depend on any
// particular client UI to be a real safeguard. Per owned Workspace
// (Architecture §4's Workspace.ownerId Restrict rule): one with other members
// needs an explicit transfer decision in `input.transfers` before this
// proceeds (400 naming the first one missing a decision, rather than
// requiring the caller to pre-enumerate every case); one with no other
// members has nowhere to transfer to, so it's deleted outright alongside the
// account.
export async function deleteAccount(userId: string, input: DeleteAccountRequest): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  if (input.confirmEmail !== user.email) {
    throw new HttpError(400, 'Confirmation email does not match your account email');
  }

  const ownedWorkspaces = await listOwnedWorkspacesWithOtherMembers(userId);
  const requestedTransferByWorkspaceId = new Map(
    input.transfers.map((t) => [t.workspaceId, t.newOwnerId]),
  );

  const transfers: { workspaceId: string; newOwnerId: string }[] = [];
  const workspaceIdsToDelete: string[] = [];

  for (const ws of ownedWorkspaces) {
    if (ws.members.length === 0) {
      workspaceIdsToDelete.push(ws.id);
      continue;
    }

    const newOwnerId = requestedTransferByWorkspaceId.get(ws.id);
    if (!newOwnerId) {
      throw new HttpError(
        400,
        `You must transfer ownership of workspace "${ws.name}" before deleting your account`,
      );
    }
    if (!ws.members.some((m) => m.userId === newOwnerId)) {
      throw new HttpError(400, `The chosen new owner is not a member of workspace "${ws.name}"`);
    }
    transfers.push({ workspaceId: ws.id, newOwnerId });
  }

  await deleteUserAndTransferWorkspaces(userId, transfers, workspaceIdsToDelete);
}
