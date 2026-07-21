import { defineConfig, devices } from '@playwright/test';

// Story 8.3 (NFR9): full-stack E2E — Playwright drives a real browser
// against real apps/web + apps/api dev servers, which in turn talk to the
// same isolated `todoapp_test` database + Redis logical db 1 Story 8.2's
// Vitest suite already established (see apps/api/vitest.config.ts). Not
// meant to run concurrently with `pnpm test` against local infra — both
// assume they own that database's contents for the duration of the run.
//
// Dedicated ports (3100/4100) rather than the app's usual 3000/4000 so this
// suite never collides with a `pnpm dev` a developer already has running.
const WEB_PORT = 3100;
const API_PORT = 4100;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @todoapp/api dev',
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL:
          process.env.E2E_DATABASE_URL ??
          'postgresql://todoapp:todoapp@localhost:5433/todoapp_test?schema=public',
        REDIS_URL: process.env.E2E_REDIS_URL ?? 'redis://localhost:6379/1',
        JWT_ACCESS_SECRET: 'e2e-test-secret',
        CORS_ORIGIN: WEB_URL,
      },
    },
    {
      // A production build+start rather than `next dev` — Turbopack dev's
      // on-demand/lazy per-route compilation caused multi-second-plus stalls
      // on each route's first-ever navigation (observed directly: a blank
      // page mid-"Fast Refresh rebuilding" when this suite hit a fresh
      // route), which read as app bugs but weren't. A production build
      // compiles everything upfront instead, trading a one-time build cost
      // for deterministic, fast navigations for the rest of the run — also
      // the more realistic target for an E2E suite anyway.
      command: 'pnpm --filter @todoapp/web build && pnpm --filter @todoapp/web start',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        PORT: String(WEB_PORT),
        NEXT_PUBLIC_API_URL: API_URL,
      },
    },
  ],
});
