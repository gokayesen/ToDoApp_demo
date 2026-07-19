import type { Board } from '@prisma/client';
import type {
  CreateBoardRequest,
  DeleteBoardRequest,
  InviteBoardMemberRequest,
  UpdateBoardBackgroundRequest,
  UpdateBoardMemberRoleRequest,
} from '@todoapp/shared';

import { sendBoardInviteEmail, sendBoardMemberAddedEmail } from '../lib/email.js';
import { HttpError } from '../lib/http-error.js';
import { generateRawInviteToken, hashInviteToken, inviteTokenExpiry } from '../lib/invite-token.js';
import {
  addBoardMember,
  findBoardMember,
  removeBoardMember as removeBoardMemberRow,
  updateBoardMemberRole,
} from '../repositories/board-member.repository.js';
import {
  createBoardForWorkspace,
  deleteBoard as deleteBoardRow,
  listBoardsForWorkspace,
  listBoardsForWorkspaceMember,
  setBoardArchived,
  setBoardBackground,
} from '../repositories/board.repository.js';
import { createBoardInvite } from '../repositories/board-invite.repository.js';
import { findUserByEmail } from '../repositories/user.repository.js';
import { findWorkspaceMember } from '../repositories/workspace-member.repository.js';
import { findWorkspaceById } from '../repositories/workspace.repository.js';
import { ROLE_RANK } from '../middleware/require-role.js';
import { emitBoardAccessRevoked } from '../sockets/board-access.js';

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

// FR39: the Dashboard's per-workspace board grid. Same visibility split as
// createBoard's membership check — Owner sees every non-archived Board,
// everyone else only the ones they have an explicit BoardMember row on.
export async function listBoards(userId: string, workspaceId: string) {
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) throw new HttpError(404, 'Workspace not found');

  const membership = await findWorkspaceMember(workspaceId, userId);
  if (!membership) throw new HttpError(403, 'You do not have access to this workspace');

  return membership.role === 'OWNER'
    ? listBoardsForWorkspace(workspaceId)
    : listBoardsForWorkspaceMember(workspaceId, userId);
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

// Architecture §7.4: Owner access is derived, not stored, so it can't be
// downgraded/removed through the BoardMember row — there isn't one. Shared by
// both changeBoardMemberRole and removeBoardMember below.
async function assertNotWorkspaceOwner(board: Board, targetUserId: string): Promise<void> {
  const workspace = await findWorkspaceById(board.workspaceId);
  if (workspace?.ownerId === targetUserId) {
    throw new HttpError(
      400,
      "Workspace Owners can't be removed from a Board directly; remove them from the Workspace instead",
    );
  }
}

// FR10: requireRole('ADMIN') on the route already confirms the caller is a
// Board Admin. A downgrade triggers the Architecture §6 eviction flow (stubbed
// until Story 5.1's Socket.io gateway exists — see sockets/board-access.ts).
export async function changeBoardMemberRole(
  board: Board,
  targetUserId: string,
  input: UpdateBoardMemberRoleRequest,
) {
  await assertNotWorkspaceOwner(board, targetUserId);

  const membership = await findBoardMember(board.id, targetUserId);
  if (!membership) throw new HttpError(404, 'This user is not a member of the board');

  const updated = await updateBoardMemberRole(board.id, targetUserId, input.role);

  if (ROLE_RANK[input.role] < ROLE_RANK[membership.role]) {
    emitBoardAccessRevoked(board.id, targetUserId);
  }

  return updated;
}

export async function removeBoardMember(board: Board, targetUserId: string) {
  await assertNotWorkspaceOwner(board, targetUserId);

  const membership = await findBoardMember(board.id, targetUserId);
  if (!membership) throw new HttpError(404, 'This user is not a member of the board');

  await removeBoardMemberRow(board.id, targetUserId);
  emitBoardAccessRevoked(board.id, targetUserId);
}

// FR11: archive/restore is Board-Admin-only, same grouping as archive/delete
// in PRD §5's role table. Idempotent — archiving an already-archived board (or
// restoring an already-active one) just re-affirms the state rather than
// erroring, since there's no meaningful conflict to report.
export function archiveBoard(board: Board) {
  return setBoardArchived(board.id, true);
}

export function restoreBoard(board: Board) {
  return setBoardArchived(board.id, false);
}

// FR12: Owner/Admin only (requireRole('ADMIN') on the route). The confirmation
// step is a type-to-confirm check against the board's current name — cheap to
// verify server-side and doesn't depend on any particular client UI existing
// yet to be a real safeguard against an accidental irreversible delete.
export async function deleteBoard(board: Board, input: DeleteBoardRequest): Promise<void> {
  if (input.confirmName !== board.name) {
    throw new HttpError(400, 'Confirmation text does not match the board name');
  }

  await deleteBoardRow(board.id);
}

// FR13: same "board settings" role grouping as archive/delete — Admin-only.
export function updateBoardBackground(board: Board, input: UpdateBoardBackgroundRequest) {
  return setBoardBackground(board.id, input.background);
}
