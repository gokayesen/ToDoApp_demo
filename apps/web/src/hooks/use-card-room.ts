'use client';

import { useEffect } from 'react';

import { getSocket } from '@/lib/socket-client';

// Story 5.5: same join/leave-on-lifecycle pattern as useBoardRoom, one level
// deeper — joins room `card:{cardId}` while a Card Detail is open (server
// re-validates board access per join, same as board:join). Unlike
// useBoardRoom, cardId is nullable: Card Detail isn't always open, so this
// hook is a no-op whenever it's null.
export function useCardRoom(cardId: string | null): void {
  useEffect(() => {
    if (!cardId) return;
    const socket = getSocket();

    function join() {
      socket.emit('card:join', cardId, (result: { ok: boolean; error?: string }) => {
        if (!result.ok) {
          console.error(`Failed to join card room ${cardId}: ${result.error}`);
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
      socket.emit('card:leave', cardId);
    };
  }, [cardId]);
}
