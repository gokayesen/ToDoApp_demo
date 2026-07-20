'use client';

import type { PresenceMember, PresenceUpdate } from '@todoapp/shared';
import { useEffect, useState } from 'react';

import { getSocket } from '@/lib/socket-client';

// Story 5.2: subscribes to the `presence:update` broadcasts the gateway
// sends after every board:join/board:leave/disconnect (Architecture §6).
// Room membership itself is owned by useBoardRoom — this hook only reads the
// list it produces, so it's safe to mount independently (e.g. just for the
// header) without duplicating the join/leave lifecycle.
export function usePresence(boardId: string): PresenceMember[] {
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    setMembers([]);
    const socket = getSocket();

    function handleUpdate(update: PresenceUpdate) {
      if (update.boardId === boardId) setMembers(update.members);
    }

    socket.on('presence:update', handleUpdate);
    return () => {
      socket.off('presence:update', handleUpdate);
    };
  }, [boardId]);

  return members;
}
