import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { API_URL } from '../fixtures/api';

test('register, logout, wrong-password rejection, then a correct login', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const name = 'Playwright User';
  const password = 'Password123!';

  await page.goto('/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();

  // Registration lands on the dashboard, authenticated — the top bar's user
  // menu button renders the signed-in user's name.
  await expect(page.getByRole('button', { name })).toBeVisible();

  await page.getByRole('button', { name }).click();
  await page.getByText('Log out').click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('the-wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();

  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name })).toBeVisible();
});

test('rejects a duplicate email at registration', async ({ page, request }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const registerRes = await request.post(`${API_URL}/auth/register`, {
    data: { email, name: 'First', password: 'Password123!' },
  });
  expect(registerRes.ok()).toBe(true);

  await page.goto('/register');
  await page.getByLabel('Name').fill('Second');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page.getByText(/already registered/i)).toBeVisible();
});
