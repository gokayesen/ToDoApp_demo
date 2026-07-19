import { io, type Socket } from 'socket.io-client';

import { API_URL, getAccessToken } from './api-client';
import { refreshSession } from './auth-api';

let socket: Socket | undefined;

// Architecture §6: one shared socket per browser session (not one per board)
// — the handshake-auth and reconnect logic below only need to run once, and
// every open board just joins/leaves rooms on top of it.
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(API_URL, {
    autoConnect: false,
    // A function, not a static object literal, so every (re)connection
    // attempt reads whatever access token is currently in memory rather than
    // the one that was live when the socket was first constructed.
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  // "Reconnection on token expiry" (Architecture §6): if the in-memory access
  // token was stale at the moment of a (re)connect attempt, the server
  // rejects the handshake. Silently refresh via the same REST flow already
  // used on page load, then retry — socket.io-client's own automatic
  // reconnect/backoff handles everything else, this just shortcuts it with a
  // fresh token instead of retrying the same stale one.
  socket.on('connect_error', () => {
    refreshSession()
      .then(() => socket?.connect())
      .catch(() => {
        // No valid session to refresh (e.g. the user logged out) — let
        // socket.io's own retry/backoff keep quietly trying rather than
        // surface an error for what's an expected state at that point.
      });
  });

  return socket;
}
