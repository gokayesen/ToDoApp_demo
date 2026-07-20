import { boardRoom, getIO } from './gateway.js';
import { findSocketIdsForUser, listPresence, markAbsent } from '../services/presence.service.js';

// Architecture §6's membership-change eviction flow: looks up the affected
// user's active connections into this board via the Story 5.2 presence set,
// emits `board:access-revoked` to those socket ids, then either force-leaves
// just this board's room (role downgrade — the socket may still be good for
// other boards) or fully disconnects the socket (removal — the user lost all
// access to this board, no reason to keep the connection alive on its
// account). `io.to`/`io.in` take socket ids directly and are adapter-aware,
// so this works whether or not that connection lives on this process.
export async function emitBoardAccessRevoked(
  boardId: string,
  userId: string,
  options: { fullyDisconnect?: boolean } = {},
): Promise<void> {
  const io = getIO();
  const socketIds = await findSocketIdsForUser(boardId, userId);
  if (socketIds.length === 0) return;

  io.to(socketIds).emit('board:access-revoked', { boardId });

  if (options.fullyDisconnect) {
    // The socket's own `disconnect` handler (gateway.ts) already cleans up
    // presence + broadcasts `presence:update` for every board it had
    // joined, this one included — nothing left to do here.
    io.in(socketIds).disconnectSockets(true);
    return;
  }

  // `socketsLeave` doesn't run the app-level `board:leave` handler, so the
  // presence bookkeeping for this one board is done explicitly here instead.
  io.in(socketIds).socketsLeave(boardRoom(boardId));
  await Promise.all(socketIds.map((socketId) => markAbsent(boardId, socketId)));
  io.to(boardRoom(boardId)).emit('presence:update', {
    boardId,
    members: await listPresence(boardId),
  });
}
