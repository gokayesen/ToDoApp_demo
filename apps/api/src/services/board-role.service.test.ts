import { afterEach, describe, expect, it } from 'vitest';

import {
  addTestBoardMember,
  cleanupUser,
  cleanupWorkspace,
  createTestBoard,
  createTestUser,
  createTestWorkspaceWithOwner,
} from '../test-support/fixtures.js';
import { resolveBoardRole } from './board-role.service.js';

describe('resolveBoardRole', () => {
  const cleanup: { userIds: string[]; workspaceIds: string[] } = { userIds: [], workspaceIds: [] };

  afterEach(async () => {
    for (const workspaceId of cleanup.workspaceIds.splice(0)) await cleanupWorkspace(workspaceId);
    for (const userId of cleanup.userIds.splice(0)) await cleanupUser(userId);
  });

  it('grants a Workspace Owner implicit ADMIN even with no BoardMember row', async () => {
    const { user: owner } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id);

    expect(await resolveBoardRole(board, owner.id)).toBe('ADMIN');
  });

  it('falls back to the explicit BoardMember role for a non-Owner', async () => {
    const { user: owner } = await createTestUser();
    const { user: member } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    await addTestBoardMember(board.id, member.id, 'VIEWER');
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id, member.id);

    expect(await resolveBoardRole(board, member.id)).toBe('VIEWER');
  });

  it('returns null for a user with neither an implicit nor an explicit membership', async () => {
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id, stranger.id);

    expect(await resolveBoardRole(board, stranger.id)).toBeNull();
  });
});
