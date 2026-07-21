import 'dotenv/config';
import './instrument.js';
import { createServer } from 'http';

import { createApp } from './app.js';
import { runDueDateSweep } from './jobs/due-date-sweep.js';
import { withLeaderLock } from './jobs/leader-lock.js';
import { logger } from './lib/logger.js';
import { createSocketGateway } from './sockets/gateway.js';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
// Socket.io shares the REST server's HTTP port/TLS termination (Architecture
// §9/§10 — this is also what the Story 1.3 Railway spike verified works
// through Railway's proxy), so the plain http.Server has to be created here
// rather than via app.listen(), which hides it.
const httpServer = createServer(app);
createSocketGateway(httpServer);

httpServer.listen(port, () => {
  logger.info(`api listening on :${port}`);
});

// Story 6.4 (FR34/NFR5): Architecture §9's in-process fallback for the
// due-date sweep — "if a separate service isn't warranted yet, the
// in-process fallback must acquire a Redis SETNX leader lock before running
// — never fire unconditionally per-instance." Every `api` instance runs this
// same interval; withLeaderLock ensures only one of them actually executes
// per tick. Superseded by a dedicated Railway cron service calling
// jobs/run-due-date-sweep.ts once Story 8.7 deploys this API.
const DUE_DATE_SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const DUE_DATE_SWEEP_LOCK_TTL_MS = 5 * 60 * 1000;

function runSweepTick() {
  withLeaderLock('lock:due-date-sweep', DUE_DATE_SWEEP_LOCK_TTL_MS, runDueDateSweep).catch(
    (error: unknown) => {
      logger.error({ err: error }, 'due-date sweep failed');
    },
  );
}

runSweepTick();
setInterval(runSweepTick, DUE_DATE_SWEEP_INTERVAL_MS);
