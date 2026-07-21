import { afterEach, describe, expect, it } from 'vitest';

import { findCardById } from '../repositories/card.repository.js';
import {
  cleanupUser,
  cleanupWorkspace,
  createTestBoard,
  createTestList,
  createTestUser,
  createTestWorkspaceWithOwner,
} from '../test-support/fixtures.js';
import { archiveCard, createCard, moveCard, restoreCard, updateCard } from './card.service.js';

describe('card.service', () => {
  const cleanup: { userIds: string[]; workspaceIds: string[] } = { userIds: [], workspaceIds: [] };

  afterEach(async () => {
    for (const workspaceId of cleanup.workspaceIds.splice(0)) await cleanupWorkspace(workspaceId);
    for (const userId of cleanup.userIds.splice(0)) await cleanupUser(userId);
  });

  async function setupBoard() {
    const { user: owner } = await createTestUser();
    const workspace = await createTestWorkspaceWithOwner(owner.id);
    const board = await createTestBoard(workspace.id);
    const list = await createTestList(board.id);
    cleanup.workspaceIds.push(workspace.id);
    cleanup.userIds.push(owner.id);
    return { owner, board, list };
  }

  it('appends a new card after the current last position', async () => {
    const { list, owner } = await setupBoard();
    const first = await createCard(list, { title: 'First' }, owner.id);
    const second = await createCard(list, { title: 'Second' }, owner.id);

    expect(second.position).toBeGreaterThan(first.position);
  });

  it('rejects a stale update with 409 and does not apply the rejected write', async () => {
    const { list, board, owner } = await setupBoard();
    const card = await createCard(list, { title: 'Original' }, owner.id);
    // The "loser" captures this at the start of their own edit session, per
    // card-detail.tsx's expectedUpdatedAtRef convention.
    const capturedAtEditStart = card.updatedAt;

    // Someone else's write lands first — the row's updatedAt advances.
    await updateCard(card, board.id, owner.id, { title: 'Winner' });

    // The loser's request re-loads the now-current row (loadCardContext does
    // this per request in the real route), then submits with the stale
    // timestamp it captured before the winner's write landed.
    const currentCard = await findCardById(card.id);
    await expect(
      updateCard(currentCard!, board.id, owner.id, {
        title: 'Loser',
        expectedUpdatedAt: capturedAtEditStart,
      }),
    ).rejects.toMatchObject({ status: 409 });

    const fresh = await findCardById(card.id);
    expect(fresh?.title).toBe('Winner');
  });

  it('applies the write when expectedUpdatedAt matches the current row', async () => {
    const { list, board, owner } = await setupBoard();
    const card = await createCard(list, { title: 'Original' }, owner.id);

    const updated = await updateCard(card, board.id, owner.id, {
      title: 'Updated',
      expectedUpdatedAt: card.updatedAt,
    });

    expect(updated.title).toBe('Updated');
  });

  it('moves a card to a target position relative to a live neighbor', async () => {
    const { list, owner } = await setupBoard();
    const cardA = await createCard(list, { title: 'A' }, owner.id);
    const cardB = await createCard(list, { title: 'B' }, owner.id);
    const cardC = await createCard(list, { title: 'C' }, owner.id);

    // Move C to sit between A and B.
    const moved = await moveCard(
      cardC,
      list,
      { listId: list.id, afterCardId: cardA.id, beforeCardId: cardB.id },
      owner.id,
    );

    expect(moved.position).toBeGreaterThan(cardA.position);
    expect(moved.position).toBeLessThan(cardB.position);
  });

  it('rejects moving a card relative to itself with 400', async () => {
    const { list, owner } = await setupBoard();
    const card = await createCard(list, { title: 'Solo' }, owner.id);

    await expect(
      moveCard(card, list, { listId: list.id, afterCardId: card.id, beforeCardId: null }, owner.id),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('archive/restore is idempotent and only flips isArchived once', async () => {
    const { list, board, owner } = await setupBoard();
    const card = await createCard(list, { title: 'Archivable' }, owner.id);

    const archived = await archiveCard(card, board.id, owner.id);
    expect(archived.isArchived).toBe(true);

    const archivedAgain = await archiveCard(archived, board.id, owner.id);
    expect(archivedAgain.isArchived).toBe(true);

    const restored = await restoreCard(archivedAgain, board.id, owner.id);
    expect(restored.isArchived).toBe(false);
  });
});
