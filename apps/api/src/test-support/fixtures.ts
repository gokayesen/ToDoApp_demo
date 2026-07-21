import { randomUUID } from 'node:crypto';
import type { BoardRole } from '@prisma/client';

import { hashPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';

// Story 8.2 (NFR9): shared fixture helpers for integration tests running
// against the real `todoapp_test` database (vitest.config.ts). Each helper
// creates unique, real rows the same way this codebase's own throwaway
// verification scripts always have — no mocking. Tests own their fixtures'
// cleanup (cleanupWorkspace/cleanupUser below) rather than relying on a
// global truncate, so files running in parallel Vitest workers never collide.

export async function createTestUser(overrides: { name?: string; password?: string } = {}) {
  const password = overrides.password ?? 'Password123!';
  const user = await prisma.user.create({
    data: {
      email: `test-${randomUUID()}@example.com`,
      name: overrides.name ?? 'Test User',
      passwordHash: await hashPassword(password),
    },
  });
  return { user, password };
}

// Mirrors workspace.repository.ts's createWorkspaceWithOwner exactly (same
// transaction shape) rather than importing it, so this fixture stays valid
// even if that repository's own signature changes.
export async function createTestWorkspaceWithOwner(ownerId: string) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: `Test Workspace ${randomUUID()}`, ownerId },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: ownerId, role: 'OWNER' },
    });
    return workspace;
  });
}

export function createTestBoard(workspaceId: string, name = `Test Board ${randomUUID()}`) {
  return prisma.board.create({ data: { workspaceId, name } });
}

export function addTestBoardMember(boardId: string, userId: string, role: BoardRole = 'MEMBER') {
  return prisma.boardMember.create({ data: { boardId, userId, role } });
}

export function createTestList(boardId: string, position = 1024, name = 'Test List') {
  return prisma.list.create({ data: { boardId, name, position } });
}

export function createTestCard(listId: string, position = 1024, title = 'Test Card') {
  return prisma.card.create({ data: { listId, title, position } });
}

// Workspace.ownerId is onDelete: Restrict (Architecture §4 — an Owner can't
// be deleted out from under their Workspace without an explicit ownership
// transfer, Story 8.8), so every fixture workspace must be deleted before its
// owning user. Deleting the Workspace cascades Board/List/Card/membership
// rows for free.
export async function cleanupWorkspace(workspaceId: string): Promise<void> {
  await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => undefined);
}

export async function cleanupUser(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}
