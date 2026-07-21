import 'dotenv/config';
import '../instrument.js';

import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';
import { runDueDateSweep } from './due-date-sweep.js';
import { withLeaderLock } from './leader-lock.js';

// Architecture §9: "Scheduled jobs ... run as a separate Railway
// cron-triggered service (not in the same long-running process as the
// API)". This is that separate entrypoint — Story 8.7 wires Railway's cron
// trigger to run `node dist/jobs/run-due-date-sweep.js` on a schedule (e.g.
// every 15 minutes) once the API is actually deployed there. Still wrapped
// in the same leader lock as index.ts's in-process fallback below, since a
// misconfigured overlapping cron trigger (or the in-process fallback still
// running alongside it) should degrade to a no-op, not a double-send.
const LOCK_KEY = 'lock:due-date-sweep';
const LOCK_TTL_MS = 5 * 60 * 1000;

async function main() {
  const ran = await withLeaderLock(LOCK_KEY, LOCK_TTL_MS, async () => {
    const result = await runDueDateSweep();
    logger.info(
      { overdueNotified: result.overdueNotified, dueSoonNotified: result.dueSoonNotified },
      'due-date sweep complete',
    );
  });
  if (!ran) logger.info('due-date sweep skipped — another instance holds the lock');
}

main()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'due-date sweep failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    redis.disconnect();
    await prisma.$disconnect();
  });
