// Placeholder for Architecture §6's membership-change eviction flow: on
// removal or role downgrade, look up the affected user's active connections
// via the `presence:board:{boardId}` Redis set, emit `board:access-revoked`
// to those socket ids, then force `socket.leave(room)`. The Socket.io gateway
// itself doesn't exist yet (Story 5.1) — until then this is a documented
// no-op, and a still-open tab simply keeps stale data until its next REST
// call, which will get a real 403.
export function emitBoardAccessRevoked(boardId: string, userId: string): void {
  console.log(`[sockets:stub] board:access-revoked pending Story 5.1 — board=${boardId} user=${userId}`);
}
