import { afterEach, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma.js';
import { listNotifications } from '../services/notification.service.js';
import {
  addTestBoardMember,
  cleanupUser,
  cleanupWorkspace,
  createTestBoard,
  createTestCard,
  createTestList,
  createTestUser,
  createTestWorkspaceWithOwner,
} from '../test-support/fixtures.js';
import { runDueDateSweep } from './due-date-sweep.js';

describe('runDueDateSweep', () => {
  const cleanup: { userIds: string[]; workspaceIds: string[] } = { userIds: [], workspaceIds: [] };

  afterEach(async () => {
    for (const workspaceId of cleanup.workspaceIds.splice(0)) await cleanupWorkspace(workspaceId);
    for (const userId of cleanup.userIds.splice(0)) await cleanupUser(userId);
  });

  async function setupAssignedCard(dueDate: Date) {
    const { user: owner } = await createTestUser();
    const { user: assignee } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    await addTestBoardMember(board.id, assignee.id, 'MEMBER');
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);
    await prisma.card.update({ where: { id: card.id }, data: { dueDate } });
    await prisma.cardAssignee.create({ data: { cardId: card.id, userId: assignee.id } });

    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id, assignee.id);
    return { card, assignee, boardId: board.id };
  }

  it('notifies every assignee of an overdue card and marks it notified', async () => {
    const { card, assignee } = await setupAssignedCard(new Date(Date.now() - 60_000));

    const result = await runDueDateSweep();

    expect(result.overdueNotified).toBeGreaterThanOrEqual(1);
    const notifications = await listNotifications(assignee.id);
    expect(notifications.some((n) => n.type === 'card.overdue')).toBe(true);

    const updated = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(updated.overdueNotifiedAt).not.toBeNull();
  });

  it('notifies assignees of a card due within the next 24h as due-soon, not overdue', async () => {
    const { assignee } = await setupAssignedCard(new Date(Date.now() + 60 * 60 * 1000));

    await runDueDateSweep();

    const notifications = await listNotifications(assignee.id);
    expect(notifications.some((n) => n.type === 'card.due_soon')).toBe(true);
    expect(notifications.some((n) => n.type === 'card.overdue')).toBe(false);
  });

  it('does not re-notify an already-overdue-notified card on a second sweep', async () => {
    const { card, assignee } = await setupAssignedCard(new Date(Date.now() - 60_000));

    await runDueDateSweep();
    const firstRunCount = (await listNotifications(assignee.id)).length;
    const secondRun = await runDueDateSweep();

    const cardStillPresent = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(cardStillPresent.overdueNotifiedAt).not.toBeNull();
    expect(await listNotifications(assignee.id)).toHaveLength(firstRunCount);
    // The second run may still notify other unrelated cards left over from
    // other tests' leftover state within the same sweep window, so only
    // assert this specific card didn't contribute another notification —
    // already covered by the unchanged notification count above.
    void secondRun;
  });
});
