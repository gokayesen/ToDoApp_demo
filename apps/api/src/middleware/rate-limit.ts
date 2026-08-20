import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { redis } from '../lib/redis.js';

// Redis-backed so the limit holds across horizontally scaled instances
// (Architecture §8/§9 — the default in-memory store is per-process).
// limit is overridable (AUTH_RATE_LIMIT) so the E2E suite — many auth calls
// from a single IP within one Redis-shared 15min window — isn't throttled
// by a threshold sized for real client traffic; unset in production.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.AUTH_RATE_LIMIT ? Number(process.env.AUTH_RATE_LIMIT) : 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:auth:',
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<never>,
  }),
});
