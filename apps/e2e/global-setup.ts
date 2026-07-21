import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Redis from 'ioredis';

// Self-sufficient the same way apps/api/vitest.global-setup.ts is — this
// suite shouldn't implicitly depend on Story 8.2's Vitest suite having run
// first against this same `todoapp_test` database. Applies pending
// migrations before the real API server (this config's webServer) boots
// against it.
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://todoapp:todoapp@localhost:5433/todoapp_test?schema=public';
// Story 1.4's Redis-backed /auth rate limiter shares state across every run
// against this Redis logical db, including previous ones — flushing before
// each E2E run keeps the auth flows this suite drives from tripping on
// leftover counts.
const REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://localhost:6379/1';

const apiDir = path.dirname(fileURLToPath(import.meta.url)) + '/../api';

export default async function globalSetup() {
  execSync('npx prisma migrate deploy', {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL },
    stdio: 'inherit',
  });

  const redis = new Redis(REDIS_URL);
  await redis.flushdb();
  redis.disconnect();
}
