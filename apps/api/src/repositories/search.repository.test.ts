import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma.js';
import {
  cleanupUser,
  cleanupWorkspace,
  createTestBoard,
  createTestList,
  createTestUser,
  createTestWorkspaceWithOwner,
} from '../test-support/fixtures.js';
import { searchCardsForUser } from './search.repository.js';

describe('searchCardsForUser', () => {
  const cleanup: { userIds: string[]; workspaceIds: string[] } = { userIds: [], workspaceIds: [] };

  afterEach(async () => {
    for (const workspaceId of cleanup.workspaceIds.splice(0)) await cleanupWorkspace(workspaceId);
    for (const userId of cleanup.userIds.splice(0)) await cleanupUser(userId);
  });

  it('only returns matching cards from boards the user can access', async () => {
    const keyword = `Zzarcher${randomUUID().slice(0, 8)}`;
    const { user: owner } = await createTestUser();
    const { user: stranger } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    const list = await createTestList(board.id);
    await prisma.card.create({ data: { listId: list.id, title: `${keyword} migration checklist`, position: 1024 } });
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id, stranger.id);

    const ownerResults = await searchCardsForUser(owner.id, keyword);
    expect(ownerResults).toHaveLength(1);

    const strangerResults = await searchCardsForUser(stranger.id, keyword);
    expect(strangerResults).toHaveLength(0);
  });

  it('excludes archived cards from results', async () => {
    const keyword = `Zzarcher${randomUUID().slice(0, 8)}`;
    const { user: owner } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    const list = await createTestList(board.id);
    await prisma.card.create({
      data: { listId: list.id, title: `${keyword} archived card`, position: 1024, isArchived: true },
    });
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id);

    expect(await searchCardsForUser(owner.id, keyword)).toHaveLength(0);
  });

  it('matches case-insensitively', async () => {
    const keyword = `Zzarcher${randomUUID().slice(0, 8)}`;
    const { user: owner } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    const list = await createTestList(board.id);
    await prisma.card.create({ data: { listId: list.id, title: `${keyword} Card`, position: 1024 } });
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id);

    expect(await searchCardsForUser(owner.id, keyword.toLowerCase())).toHaveLength(1);
    expect(await searchCardsForUser(owner.id, keyword.toUpperCase())).toHaveLength(1);
  });
});
