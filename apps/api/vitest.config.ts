import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://todoapp:todoapp@localhost:5433/todoapp_test?schema=public';
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379/1';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['./vitest.global-setup.ts'],
    // Test files share one real Postgres/Redis instance (see above). Most
    // fixtures are scoped by unique random IDs and safe to run concurrently,
    // but a few jobs (due-date-sweep.ts) intentionally query across the
    // *entire* table with no per-test scoping — running files in parallel
    // would let one test's sweep pick up another test's in-flight fixtures.
    // Sequential files is the simple, always-correct choice for a suite this
    // size; revisit if the suite grows large enough for this to matter.
    fileParallelism: false,
    // Isolated from dev data: a dedicated `todoapp_test` database (see
    // vitest.global-setup.ts) and Redis logical db 1 instead of the default
    // db 0 dev/docker-compose already uses.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      REDIS_URL: TEST_REDIS_URL,
      JWT_ACCESS_SECRET: 'test-only-access-secret',
    },
  },
});
