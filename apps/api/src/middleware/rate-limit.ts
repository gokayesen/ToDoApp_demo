import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { redis } from '../lib/redis.js';

// Redis-backed so the limit holds across horizontally scaled instances
// (Architecture §8/§9 — the default in-memory store is per-process).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    prefix: 'rl:auth:',
    sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<never>,
  }),
});
