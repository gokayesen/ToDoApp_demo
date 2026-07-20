import type { PresenceMember } from '@todoapp/shared';

import { redis } from '../lib/redis.js';
import { findUserById } from '../repositories/user.repository.js';

// Architecture §6: "each room join writes the user to a Redis set
// `presence:board:{boardId}` with a TTL-refreshed heartbeat". Two key shapes
// split that job: a Set holding which socket ids are currently in the board
// (membership), and one small TTL'd string per socket id holding that
// connection's user details (the heartbeat). A socket can be a member of
// several boards' sets at once but only ever needs one heartbeat key, since
// the user details it holds don't vary per board.
const HEARTBEAT_TTL_SECONDS = 45;

function boardSetKey(boardId: string): string {
  return `presence:board:${boardId}`;
}

function socketKey(socketId: string): string {
  return `presence:socket:${socketId}`;
}

export async function markPresent(boardId: string, socketId: string, userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) return;

  const entry: PresenceMember = { userId: user.id, name: user.name, avatarUrl: user.avatarUrl };
  await redis
    .multi()
    .sadd(boardSetKey(boardId), socketId)
    .set(socketKey(socketId), JSON.stringify(entry), 'EX', HEARTBEAT_TTL_SECONDS)
    .exec();
}

// Called on a fixed interval for every connected socket regardless of which
// (or how many) boards it has joined — a no-op EXPIRE on a key that was
// never set costs nothing, so there's no need to track per-board timers.
export async function refreshPresenceHeartbeat(socketId: string): Promise<void> {
  await redis.expire(socketKey(socketId), HEARTBEAT_TTL_SECONDS);
}

export async function markAbsent(boardId: string, socketId: string): Promise<void> {
  await redis.multi().srem(boardSetKey(boardId), socketId).del(socketKey(socketId)).exec();
}

export async function listPresence(boardId: string): Promise<PresenceMember[]> {
  const socketIds = await redis.smembers(boardSetKey(boardId));
  if (socketIds.length === 0) return [];

  const raw = await redis.mget(socketIds.map(socketKey));
  const stale: string[] = [];
  const byUserId = new Map<string, PresenceMember>();

  raw.forEach((value, i) => {
    if (!value) {
      // The heartbeat key expired (server crash, missed disconnect event)
      // while its socket id lingered in the set — drop it here rather than
      // running a separate sweep job.
      stale.push(socketIds[i]!);
      return;
    }
    const entry = JSON.parse(value) as PresenceMember;
    byUserId.set(entry.userId, entry);
  });

  if (stale.length > 0) await redis.srem(boardSetKey(boardId), ...stale);

  return [...byUserId.values()];
}

// Used by the membership-change eviction flow (Architecture §6, §7.4) to
// locate every active connection a user has into a specific board's room —
// a user can hold more than one (multiple tabs).
export async function findSocketIdsForUser(boardId: string, userId: string): Promise<string[]> {
  const socketIds = await redis.smembers(boardSetKey(boardId));
  if (socketIds.length === 0) return [];

  const raw = await redis.mget(socketIds.map(socketKey));
  return socketIds.filter((_, i) => {
    const value = raw[i];
    if (!value) return false;
    return (JSON.parse(value) as PresenceMember).userId === userId;
  });
}
