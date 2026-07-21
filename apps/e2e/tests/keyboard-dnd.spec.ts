import { expect, test, type APIRequestContext } from '@playwright/test';

import { createBoard, createCard, createList, createWorkspace, listCards, loginBrowserAs, registerUser } from '../fixtures/api';

// Story 8.4 (UX §8 "drag-and-drop has the keyboard equivalent"; FR15/FR19):
// dnd-kit's KeyboardSensor (Space to pick up, arrow keys to move, Space to
// drop, Escape to cancel — apps/web/src/components/board/card-item.tsx) had
// never actually been driven end-to-end by any prior story's own Playwright
// verification. Doing so here caught two real bugs, both fixed alongside
// this suite: (1) dnd-kit's default keyboard codes also treat Enter as a
// start/end key, which raced ahead of card-item.tsx's own onKeyDown that
// claims Enter to open Card Detail — Enter silently started an invisible
// drag instead (fixed with a per-card KeyboardSensor override dropping
// Enter, keeping Space only); (2) cards disable dnd-kit's own
// OptimisticSortingPlugin (a prior removeChild crash, see the useSortable
// comment), so an Escape-canceled card drag was never reverting the
// React-state-driven optimistic reorder board-lists.tsx's handleDragOver
// applies during the drag (fixed in handleDragEnd's canceled branch).
async function setupBoard(request: APIRequestContext) {
  const owner = await registerUser(request, 'Keyboard DnD Owner');
  const workspace = await createWorkspace(request, owner, `WS ${Date.now()}`);
  const board = await createBoard(request, owner, workspace.id, `Board ${Date.now()}`);
  const listA = await createList(request, owner, board.id, 'List A');
  const listB = await createList(request, owner, board.id, 'List B');
  const cardOne = await createCard(request, owner, listA.id, 'Card One');
  const cardTwo = await createCard(request, owner, listA.id, 'Card Two');
  const cardThree = await createCard(request, owner, listA.id, 'Card Three');
  return { owner, board, listA, listB, cardOne, cardTwo, cardThree };
}

// During a drag, dnd-kit keeps an inert placeholder (`data-dnd-placeholder`)
// in the original slot alongside the live dragged clone, both carrying the
// same `data-flip-id` — excluded here so order/visibility checks don't hit a
// strict-mode "resolved to 2 elements" violation while mid-drag or
// mid-drop-animation.
const LIVE_CARD_SELECTOR = '[data-flip-id]:not([data-dnd-placeholder])';

async function cardOrder(listColumn: import('@playwright/test').Locator): Promise<string[]> {
  return listColumn.locator(LIVE_CARD_SELECTOR).evaluateAll((els) => els.map((el) => el.getAttribute('data-flip-id')));
}

test('reorders a card within a list via Space/ArrowDown/Space', async ({ page, context, request }) => {
  const { owner, board, listA, cardOne, cardTwo, cardThree } = await setupBoard(request);
  await loginBrowserAs(context, owner);
  await page.goto(`/boards/${board.id}`);

  const listAColumn = page.locator(`[data-list-id="${listA.id}"]`);
  await expect(listAColumn.locator(LIVE_CARD_SELECTOR)).toHaveCount(3);

  await page.locator(`[data-flip-id="${cardOne.id}"]`).focus();
  await page.keyboard.press('Space'); // pick up
  await page.keyboard.press('ArrowDown'); // move one slot down
  await page.keyboard.press('Space'); // drop

  await expect(async () => {
    expect(await cardOrder(listAColumn)).toEqual([cardTwo.id, cardOne.id, cardThree.id]);
  }).toPass();
});

test('Escape cancels a keyboard drag and leaves the order unchanged', async ({ page, context, request }) => {
  const { owner, board, listA, cardOne, cardTwo, cardThree } = await setupBoard(request);
  await loginBrowserAs(context, owner);
  await page.goto(`/boards/${board.id}`);

  const listAColumn = page.locator(`[data-list-id="${listA.id}"]`);
  const originalOrder = [cardOne.id, cardTwo.id, cardThree.id];
  await expect(async () => expect(await cardOrder(listAColumn)).toEqual(originalOrder)).toPass();

  await page.locator(`[data-flip-id="${cardOne.id}"]`).focus();
  await page.keyboard.press('Space'); // pick up
  await page.keyboard.press('ArrowDown'); // move — optimistic reorder now applied
  await page.keyboard.press('Escape'); // cancel

  await expect(async () => expect(await cardOrder(listAColumn)).toEqual(originalOrder)).toPass();

  // Confirms the server never received a mutation either, not just that the
  // client eventually re-synced — checked directly via the API rather than
  // page.reload(), which re-triggers AuthContext's silent-refresh-on-load and
  // hit an unrelated, pre-existing race (a concurrent double refresh call
  // trips Story 1.4's reuse-detection and logs the session out) found while
  // writing this test; out of scope for this accessibility story to fix.
  const serverCards = await listCards(request, owner, listA.id);
  expect(serverCards.map((c: { id: string }) => c.id)).toEqual(originalOrder);
});

test('moves a card to an adjacent list via Space/ArrowRight/Space', async ({ page, context, request }) => {
  const { owner, board, listB, cardOne } = await setupBoard(request);
  await loginBrowserAs(context, owner);
  await page.goto(`/boards/${board.id}`);

  const listBColumn = page.locator(`[data-list-id="${listB.id}"]`);
  await expect(listBColumn.locator(LIVE_CARD_SELECTOR)).toHaveCount(0);

  await page.locator(`[data-flip-id="${cardOne.id}"]`).focus();
  await page.keyboard.press('Space'); // pick up
  await page.keyboard.press('ArrowRight'); // move into the adjacent list
  await page.keyboard.press('Space'); // drop

  await expect(async () => {
    expect(await cardOrder(listBColumn)).toEqual([cardOne.id]);
  }).toPass();
});

test('reorders lists via Space/ArrowRight/Space on the list name handle', async ({ page, context, request }) => {
  const { owner, board, listA, listB } = await setupBoard(request);
  await loginBrowserAs(context, owner);
  await page.goto(`/boards/${board.id}`);

  // dnd-kit's sortable handle sets role="button" on the list-name element
  // (its drag handle), overriding the underlying <h3>'s implicit heading
  // role — same convention board-basics.spec.ts already relies on.
  await page.getByRole('button', { name: listA.name, exact: true }).focus();
  await page.keyboard.press('Space'); // pick up
  await page.keyboard.press('ArrowRight'); // move past List B
  await page.keyboard.press('Space'); // drop

  await expect(async () => {
    const order = await page
      .locator('[data-list-id]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-list-id')));
    expect(order).toEqual([listB.id, listA.id]);
  }).toPass();
});

test('Enter on a focused card opens Card Detail instead of starting a drag', async ({ page, context, request }) => {
  const { owner, board, cardOne } = await setupBoard(request);
  await loginBrowserAs(context, owner);
  await page.goto(`/boards/${board.id}`);

  await page.locator(`[data-flip-id="${cardOne.id}"]`).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('dialog')).toBeVisible();
});
