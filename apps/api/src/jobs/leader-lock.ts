import { redis } from '../lib/redis.js';

// Architecture §9: "the in-process fallback must acquire a Redis SETNX
// leader lock before running — never fire unconditionally per-instance."
// Every `api` instance's own scheduler attempts this on each tick; only
// whichever one wins the SET...NX actually runs `fn`, so the job still
// executes exactly once across however many instances are live even before
// Story 8.7 stands up a dedicated Railway cron service. Returns whether this
// call was the one that ran `fn`.
export async function withLeaderLock(key: string, ttlMs: number, fn: () => Promise<unknown>): Promise<boolean> {
  const acquired = await redis.set(key, '1', 'PX', ttlMs, 'NX');
  if (acquired !== 'OK') return false;

  try {
    await fn();
  } finally {
    await redis.del(key);
  }
  return true;
}
