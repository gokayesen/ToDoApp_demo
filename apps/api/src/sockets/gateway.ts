import { createAdapter } from '@socket.io/redis-adapter';
import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

import { verifyAccessToken } from '../lib/jwt.js';
import { redis } from '../lib/redis.js';
import { findBoardById } from '../repositories/board.repository.js';
import { resolveBoardRole } from '../services/board-role.service.js';

// The fourth Server/Socket generic (SocketData) is how socket.io types
// per-connection state — `declare module` augmentation of Socket.data
// conflicts with its own built-in declaration, this is the supported path.
interface SocketData {
  userId: string;
}

type GatewayServer = Server<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;

let io: GatewayServer | undefined;

// Architecture §6: read path is sockets, write path stays REST — this gateway
// only ever needs to emit into rooms (Story 5.3) or look up presence (Story
// 5.2), so a simple module-level singleton (same pattern as lib/redis.ts) is
// enough; nothing here needs per-request dependency injection.
export function getIO(): GatewayServer {
  if (!io) throw new Error('Socket.io gateway has not been created yet');
  return io;
}

export function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}

type JoinAck = (result: { ok: boolean; error?: string }) => void;

// Story 5.1: handshake auth, connection middleware, board:join/leave with
// server-side role re-validation, Redis adapter for horizontal scale-out.
// Presence writes (Story 5.2) and the mutation broadcast pipeline (Story 5.3)
// build on top of this, not here.
export function createSocketGateway(httpServer: HttpServer): GatewayServer {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN, credentials: true },
  });

  // Dedicated pub/sub connections — ioredis can't issue other commands on a
  // connection that's in subscriber mode, so the adapter needs its own pair
  // rather than reusing lib/redis.ts's shared client.
  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Same verification logic as the REST `authenticate` middleware (Architecture
  // §6): reject at handshake, before any board:join is possible, rather than
  // letting an unauthenticated socket connect and rejecting it per-event.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string') {
      next(new Error('Missing access token'));
      return;
    }

    try {
      socket.data.userId = verifyAccessToken(token).sub;
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('board:join', async (boardId: unknown, ack?: JoinAck) => {
      if (typeof boardId !== 'string') {
        ack?.({ ok: false, error: 'boardId must be a string' });
        return;
      }

      const board = await findBoardById(boardId);
      if (!board) {
        ack?.({ ok: false, error: 'Board not found' });
        return;
      }

      // Never trust a client-supplied board ID without re-checking access
      // server-side (Architecture §6) — the same rule loadBoardContext
      // enforces on every REST board route.
      const role = await resolveBoardRole(board, socket.data.userId);
      if (!role) {
        ack?.({ ok: false, error: 'You do not have access to this board' });
        return;
      }

      socket.join(boardRoom(boardId));
      ack?.({ ok: true });
    });

    socket.on('board:leave', (boardId: unknown) => {
      if (typeof boardId === 'string') socket.leave(boardRoom(boardId));
    });
  });

  return io;
}
