import type { Board, BoardRole } from '@prisma/client';

import { findBoardMember } from '../repositories/board-member.repository.js';
import { findWorkspaceMember } from '../repositories/workspace-member.repository.js';

// Single source of truth for effective-role resolution (Architecture §5/§7.4),
// shared by the REST loadBoardContext middleware and the Story 5.1 socket
// gateway's board:join re-validation — both need the exact same answer to
// "does this user have access to this Board, and at what role."
//
//   1. WorkspaceMember.role === OWNER on the Workspace that owns this Board =>
//      implicit ADMIN, even with no BoardMember row (the "Owner can do everything
//      an Admin can" guarantee from PRD §5, made mechanical rather than assumed).
//   2. Otherwise, whatever the explicit BoardMember row says.
//   3. Neither => null (caller 403s / rejects the join).
export async function resolveBoardRole(board: Board, userId: string): Promise<BoardRole | null> {
  const workspaceMembership = await findWorkspaceMember(board.workspaceId, userId);
  if (workspaceMembership?.role === 'OWNER') return 'ADMIN';

  const boardMembership = await findBoardMember(board.id, userId);
  return boardMembership?.role ?? null;
}
