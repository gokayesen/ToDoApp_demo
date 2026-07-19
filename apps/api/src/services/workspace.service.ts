import type { CreateWorkspaceRequest, InviteWorkspaceMemberRequest } from '@todoapp/shared';

import { sendWorkspaceInviteEmail, sendWorkspaceMemberAddedEmail } from '../lib/email.js';
import { HttpError } from '../lib/http-error.js';
import { generateRawInviteToken, hashInviteToken, inviteTokenExpiry } from '../lib/invite-token.js';
import { findUserByEmail } from '../repositories/user.repository.js';
import {
  addWorkspaceMember,
  findWorkspaceMember,
} from '../repositories/workspace-member.repository.js';
import { createWorkspaceInvite } from '../repositories/workspace-invite.repository.js';
import {
  createWorkspaceWithOwner,
  findWorkspaceById,
  listWorkspacesForUser,
} from '../repositories/workspace.repository.js';

export function createWorkspace(userId: string, input: CreateWorkspaceRequest) {
  return createWorkspaceWithOwner(input.name, userId);
}

export function listWorkspaces(userId: string) {
  return listWorkspacesForUser(userId);
}

// FR7: only the Workspace Owner can invite. An email with an existing account
// is added as a WorkspaceMember immediately (nothing left "pending"); an email
// with no account gets a WorkspaceInvite that resolves on registration (see
// auth.service.register's resolvePendingInvites call).
export async function inviteMember(
  inviterId: string,
  workspaceId: string,
  input: InviteWorkspaceMemberRequest,
) {
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) throw new HttpError(404, 'Workspace not found');

  const inviterMembership = await findWorkspaceMember(workspaceId, inviterId);
  if (inviterMembership?.role !== 'OWNER') {
    throw new HttpError(403, 'Only the Workspace Owner can invite members');
  }

  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    const alreadyMember = await findWorkspaceMember(workspaceId, existingUser.id);
    if (alreadyMember) throw new HttpError(409, 'This user is already a member of the workspace');

    await addWorkspaceMember(workspaceId, existingUser.id);
    await sendWorkspaceMemberAddedEmail(existingUser.email, workspace.name);
    return { status: 'added' as const };
  }

  const rawToken = generateRawInviteToken();
  await createWorkspaceInvite({
    workspaceId,
    email: input.email,
    invitedByUserId: inviterId,
    tokenHash: hashInviteToken(rawToken),
    expiresAt: inviteTokenExpiry(),
  });

  const registerUrl = new URL('/register', process.env.CORS_ORIGIN ?? 'http://localhost:3000');
  registerUrl.searchParams.set('invite', rawToken);
  registerUrl.searchParams.set('email', input.email);
  await sendWorkspaceInviteEmail(input.email, workspace.name, registerUrl.toString());

  return { status: 'invited' as const };
}
