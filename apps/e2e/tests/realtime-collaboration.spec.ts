import { expect, test } from '@playwright/test';

import {
  createBoard,
  createCard,
  createList,
  createWorkspace,
  inviteBoardMember,
  loginBrowserAs,
  registerUser,
} from '../fixtures/api';

// Story 8.3's flagship (Architecture "Testing" row / NFR9): two independent
// browser contexts as two different, simultaneously-connected users, proving
// the real-time collaboration pipeline (Story 5.1 gateway -> 5.3 broadcast ->
// 5.4 client live-merge) end-to-end — not just that the API emits an event,
// or that one client's own optimistic update renders.
test('moving a card is visible live to another connected user without a reload', async ({
  browser,
  request,
}) => {
  const owner = await registerUser(request, 'Realtime Owner');
  const member = await registerUser(request, 'Realtime Member');
  const workspace = await createWorkspace(request, owner, `WS ${Date.now()}`);
  const board = await createBoard(request, owner, workspace.id, `Board ${Date.now()}`);
  await inviteBoardMember(request, owner, board.id, member, 'MEMBER');
  const listA = await createList(request, owner, board.id, 'To Do');
  const listB = await createList(request, owner, board.id, 'Doing');
  const card = await createCard(request, owner, listA.id, 'Ship the feature');

  const ownerContext = await browser.newContext();
  const memberContext = await browser.newContext();
  await loginBrowserAs(ownerContext, owner);
  await loginBrowserAs(memberContext, member);
  const ownerPage = await ownerContext.newPage();
  const memberPage = await memberContext.newPage();

  try {
    await ownerPage.goto(`/boards/${board.id}`);
    await memberPage.goto(`/boards/${board.id}`);

    // Both connected (Story 5.1 board:join) and rendering the card before the move.
    const ownerCard = ownerPage.locator(`[data-flip-id="${card.id}"]`);
    await expect(ownerCard).toBeVisible();
    await expect(memberPage.locator(`[data-flip-id="${card.id}"]`)).toBeVisible();

    const memberListB = memberPage.locator(`[data-list-id="${listB.id}"]`);
    await expect(memberListB.locator(`[data-flip-id="${card.id}"]`)).toHaveCount(0);

    // Owner moves the card via the "Move to list" affordance (UX §7's mobile
    // fallback, but equally valid on desktop) — deterministic and drives the
    // exact same moveCard endpoint + card:moved broadcast (Architecture §6
    // event catalog) a pointer drag would. What this test needs to prove is
    // whether User B's DOM updates live, not whether a drag gesture can be
    // simulated reliably.
    await ownerCard.getByLabel('Move to list').click();
    await ownerPage.getByRole('menuitem', { name: 'Doing' }).click();

    // No reload on the member's page — only passes if the broadcast reached
    // this socket and the client merged it into the live query cache.
    await expect(memberListB.locator(`[data-flip-id="${card.id}"]`)).toBeVisible({ timeout: 5000 });
  } finally {
    await ownerContext.close();
    await memberContext.close();
  }
});
