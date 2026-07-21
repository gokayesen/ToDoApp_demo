import { expect, test } from '@playwright/test';

import { createBoard, createWorkspace, loginBrowserAs, registerUser } from '../fixtures/api';

test('adding a list and quick-adding a card shows up on the board', async ({ page, context, request }) => {
  const owner = await registerUser(request, 'Board Basics Owner');
  const workspace = await createWorkspace(request, owner, `WS ${Date.now()}`);
  const board = await createBoard(request, owner, workspace.id, `Board ${Date.now()}`);
  await loginBrowserAs(context, owner);

  await page.goto(`/boards/${board.id}`);
  await expect(page.getByRole('heading', { name: board.name, level: 1 })).toBeVisible();

  // UX §4.2 "+ Add list" inline affordance.
  await page.getByRole('button', { name: 'Add list' }).click();
  await page.getByPlaceholder('List name').fill('To Do');
  await page.getByRole('button', { name: 'Add list' }).click();

  // dnd-kit's sortable handle sets role="button" on the list-name element
  // (its drag handle) for keyboard accessibility, overriding the underlying
  // <h3>'s implicit heading role — see card-item.tsx/list-column.tsx.
  const listNameHandle = page.getByRole('button', { name: 'To Do', exact: true });
  await expect(listNameHandle).toBeVisible();
  const listColumn = listNameHandle.locator('xpath=ancestor::div[@data-list-id]');

  // UX §5 inline quick-add card, Enter-to-add-next.
  await listColumn.getByRole('button', { name: '+ Add card' }).click();
  await listColumn.getByPlaceholder('Enter a title for this card').fill('My first card');
  await listColumn.getByPlaceholder('Enter a title for this card').press('Enter');

  await expect(listColumn.getByText('My first card')).toBeVisible();
});
