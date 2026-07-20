'use client';

import type { CardPresenceUpdate, PresenceMember } from '@todoapp/shared';
import { useEffect, useState } from 'react';

import { getSocket } from '@/lib/socket-client';

// Story 5.5: card-level counterpart to usePresence — subscribes to
// `card:presence:update` broadcasts (gateway.ts) for whichever card is
// currently open. Room membership is owned by useCardRoom; this hook only
// reads the list it produces.
export function useCardPresence(cardId: string | null): PresenceMember[] {
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    setMembers([]);
    if (!cardId) return;
    const socket = getSocket();

    function handleUpdate(update: CardPresenceUpdate) {
      if (update.cardId === cardId) setMembers(update.members);
    }

    socket.on('card:presence:update', handleUpdate);
    return () => {
      socket.off('card:presence:update', handleUpdate);
    };
  }, [cardId]);

  return members;
}
