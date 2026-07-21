import { execSync } from 'node:child_process';
import Redis from 'ioredis';

// Story 8.2 (NFR9): integration tests run against a real, separate
// `todoapp_test` database on the same local Postgres instance docker-compose
// already provides for dev (Story 1.2) — one-time manual creation via
// `pnpm --filter @todoapp/api run db:test:create`, documented there since
// this repo already treats "the docker-compose services are running" as a
// precondition of `pnpm dev` (never auto-provisioned). Applying migrations
// here, on every run, keeps the schema current without a second manual step.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://todoapp:todoapp@localhost:5433/todoapp_test?schema=public';
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';

export default async function setup() {
  execSync('npx prisma migrate deploy', {
    cwd: import.meta.dirname,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });

  // Clean slate every run (e.g. Story 1.4's auth rate limiter persists
  // across runs otherwise, and could trip a later run's login/register tests
  // with 429s left over from a previous one).
  const redis = new Redis(TEST_REDIS_URL);
  await redis.flushdb();
  redis.disconnect();
}
