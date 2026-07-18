import type { CreateBoardRequest } from '@todoapp/shared';

import { HttpError } from '../lib/http-error.js';
import { addBoardMember } from '../repositories/board-member.repository.js';
import { createBoardForWorkspace } from '../repositories/board.repository.js';
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
