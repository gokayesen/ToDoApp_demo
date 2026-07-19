import type { Board } from '@prisma/client';
import type { CreateBoardRequest, InviteBoardMemberRequest } from '@todoapp/shared';

import { sendBoardInviteEmail, sendBoardMemberAddedEmail } from '../lib/email.js';
import { HttpError } from '../lib/http-error.js';
import { generateRawInviteToken, hashInviteToken, inviteTokenExpiry } from '../lib/invite-token.js';
import { addBoardMember, findBoardMember } from '../repositories/board-member.repository.js';
import { createBoardForWorkspace } from '../repositories/board.repository.js';
import { createBoardInvite } from '../repositories/board-invite.repository.js';
import { findUserByEmail } from '../repositories/user.repository.js';
import { findWorkspaceMember } from '../repositories/workspace-member.repository.js';
import { findWorkspaceById } from '../repositories/workspace.repository.js';

// FR8: any Workspace member (Owner or Member) can create a Board. A Workspace
// Owner already gets implicit Board Admin per Architecture §7.4, so no explicit
// BoardMember row is created for them — Story 2.6's removal-protection relies
// on that row staying absent. A non-Owner creator gets an explicit ADMIN row
// so they can administer the board they just made.
export async function createBoard(userId: string, workspaceId: string, input: CreateBoardRequest) {
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) throw new HttpError(404, 'Workspace not found');

  const membership = await findWorkspaceMember(workspaceId, userId);
  if (!membership) throw new HttpError(403, 'You do not have access to this workspace');

  const board = await createBoardForWorkspace(workspaceId, input.name);

  if (membership.role !== 'OWNER') {
    await addBoardMember(board.id, userId, 'ADMIN');
  }

  return board;
}

// FR9: requireRole('ADMIN') on the route already confirms the inviter is a
// Board Admin (explicit or the Workspace Owner's implicit one, Architecture
// §7.4). Same existing-vs-not-yet-registered split as inviteMember in
// workspace.service.ts (Story 2.3): an existing email is added immediately
// with the requested role, a new one gets a pending BoardInvite that resolves
// on registration.
export async function inviteBoardMember(
  inviterId: string,
  board: Board,
  input: InviteBoardMemberRequest,
) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    const workspace = await findWorkspaceById(board.workspaceId);
    if (workspace?.ownerId === existingUser.id) {
      // The Workspace Owner already has implicit Admin on every Board in the
      // Workspace (Architecture §7.4) — an explicit row would be redundant
      // and, worse, misleading if it's ever given a lower role than ADMIN.
      throw new HttpError(
        400,
        'This user is the Workspace Owner and already has full access to this board',
      );
    }

    const alreadyMember = await findBoardMember(board.id, existingUser.id);
    if (alreadyMember) throw new HttpError(409, 'This user is already a member of the board');

    await addBoardMember(board.id, existingUser.id, input.role);
    await sendBoardMemberAddedEmail(existingUser.email, board.name);
    return { status: 'added' as const };
  }

  const rawToken = generateRawInviteToken();
  await createBoardInvite({
    boardId: board.id,
    email: input.email,
    role: input.role,
    invitedByUserId: inviterId,
    tokenHash: hashInviteToken(rawToken),
    expiresAt: inviteTokenExpiry(),
  });

  const registerUrl = new URL('/register', process.env.CORS_ORIGIN ?? 'http://localhost:3000');
  registerUrl.searchParams.set('invite', rawToken);
  registerUrl.searchParams.set('email', input.email);
  await sendBoardInviteEmail(input.email, board.name, registerUrl.toString());

  return { status: 'invited' as const };
}
