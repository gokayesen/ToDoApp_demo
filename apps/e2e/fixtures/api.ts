import { randomUUID } from 'node:crypto';
import type { APIRequestContext, BrowserContext } from '@playwright/test';

// Story 8.3: fast, real fixture setup via the actual REST API — the same
// "create real rows via the real API, then drive the real UI for the
// behavior under test" split every prior story's own manual Playwright
// verification already used, just made permanent.
export const API_URL = 'http://localhost:4100';

export interface TestUser {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  password: string;
  name: string;
}

export async function registerUser(request: APIRequestContext, name = 'E2E User'): Promise<TestUser> {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = 'Password123!';
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, name, password },
  });
  if (!res.ok()) throw new Error(`registerUser failed: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  const setCookie = res.headers()['set-cookie'] ?? '';
  // "refresh_token=<value>; Max-Age=...; Path=/auth; ..." — just the value.
  const refreshToken = setCookie.split(';')[0]?.split('=')[1] ?? '';
  return {
    accessToken: body.accessToken,
    refreshToken,
    userId: body.user.id,
    email,
    password,
    name,
  };
}

// Injects the httpOnly refresh cookie directly into the browser context, so
// a page navigation's silent-refresh-on-load (auth-context.tsx) picks up the
// session exactly as if this user had logged in through the UI — without
// actually re-driving the login form for fixture users the test doesn't care
// about logging in as its own assertion.
export async function loginBrowserAs(context: BrowserContext, user: TestUser): Promise<void> {
  await context.addCookies([
    {
      name: 'refresh_token',
      value: user.refreshToken,
      domain: 'localhost',
      path: '/auth',
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    },
  ]);
}

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function createWorkspace(request: APIRequestContext, owner: TestUser, name: string) {
  const res = await request.post(`${API_URL}/workspaces`, {
    headers: authHeaders(owner.accessToken),
    data: { name },
  });
  if (!res.ok()) throw new Error(`createWorkspace failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function createBoard(
  request: APIRequestContext,
  owner: TestUser,
  workspaceId: string,
  name: string,
) {
  const res = await request.post(`${API_URL}/workspaces/${workspaceId}/boards`, {
    headers: authHeaders(owner.accessToken),
    data: { name },
  });
  if (!res.ok()) throw new Error(`createBoard failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

// Assumes `invitee` already has an account — hits the existing-user
// direct-add branch (board.service.ts inviteBoardMember) so membership is
// immediate, no separate accept step needed.
export async function inviteBoardMember(
  request: APIRequestContext,
  owner: TestUser,
  boardId: string,
  invitee: TestUser,
  role: 'ADMIN' | 'MEMBER' | 'VIEWER' = 'MEMBER',
) {
  const res = await request.post(`${API_URL}/boards/${boardId}/invites`, {
    headers: authHeaders(owner.accessToken),
    data: { email: invitee.email, role },
  });
  if (!res.ok()) throw new Error(`inviteBoardMember failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function createList(request: APIRequestContext, owner: TestUser, boardId: string, name: string) {
  const res = await request.post(`${API_URL}/boards/${boardId}/lists`, {
    headers: authHeaders(owner.accessToken),
    data: { name },
  });
  if (!res.ok()) throw new Error(`createList failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function createCard(request: APIRequestContext, owner: TestUser, listId: string, title: string) {
  const res = await request.post(`${API_URL}/lists/${listId}/cards`, {
    headers: authHeaders(owner.accessToken),
    data: { title },
  });
  if (!res.ok()) throw new Error(`createCard failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function listCards(request: APIRequestContext, owner: TestUser, listId: string) {
  const res = await request.get(`${API_URL}/lists/${listId}/cards`, {
    headers: authHeaders(owner.accessToken),
  });
  if (!res.ok()) throw new Error(`listCards failed: ${res.status()} ${await res.text()}`);
  return res.json();
}
