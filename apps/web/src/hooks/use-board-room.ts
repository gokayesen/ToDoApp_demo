'use client';

import { useEffect } from 'react';

import { getSocket } from '@/lib/socket-client';

// Story 5.1: join/leave room `board:{boardId}` on mount/unmount, with
// server-side role re-validation on every join (Architecture §6 — a client
// can't just claim access to a board by knowing its id). This hook only
// establishes room membership; usePresence (Story 5.2) reads the live member
// list that produces, and card/list broadcasts (Story 5.3) aren't consumed
// yet.
export function useBoardRoom(boardId: string): void {
  useEffect(() => {
    const socket = getSocket();

    function join() {
      socket.emit('board:join', boardId, (result: { ok: boolean; error?: string }) => {
        if (!result.ok) {
          console.error(`Failed to join board room ${boardId}: ${result.error}`);
        }
      });
    }

    if (socket.connected) {
      join();
    } else {
      socket.connect();
    }
    socket.on('connect', join);

    return () => {
      socket.off('connect', join);
      socket.emit('board:leave', boardId);
    };
  }, [boardId]);
}
