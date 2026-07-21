'use client';

import type { CardMovedEvent, List, ListMovedEvent, PresenceMember } from '@todoapp/shared';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { getSocket } from '@/lib/socket-client';

// UX §8: real-time updates affecting the current view must be announced to
// screen readers (its own example: "Card moved to Doing by Ayşe"), not just
// shown via Story 5.4's sighted-only highlight-fade. Scoped to moves that
// land somewhere already visible — Story 5.7's out-of-view toast
// (use-out-of-view-toasts.ts) is itself a role="status" live region that
// already announces the not-visible case, so repeating it here would be
// exactly the "overly chatty" duplication UX §8 warns against.
export function useLiveMoveAnnouncements(
  currentUserId: string,
  visibleListIds: RefObject<Set<string>>,
  presence: PresenceMember[],
  lists: List[],
): string {
  const [message, setMessage] = useState('');
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const listsRef = useRef(lists);
  listsRef.current = lists;

  useEffect(() => {
    function actorName(actorId: string): string {
      return presenceRef.current.find((member) => member.userId === actorId)?.name ?? 'Someone';
    }

    function listName(listId: string): string {
      return listsRef.current.find((list) => list.id === listId)?.name ?? 'a list';
    }

    const socket = getSocket();

    function onCardMoved({ card, movedBy }: CardMovedEvent) {
      if (movedBy === currentUserId) return;
      if (!visibleListIds.current.has(card.listId)) return;
      setMessage(`Card moved to ${listName(card.listId)} by ${actorName(movedBy)}.`);
    }

    function onListMoved({ list, movedBy }: ListMovedEvent) {
      if (movedBy === currentUserId) return;
      setMessage(`List "${list.name}" reordered by ${actorName(movedBy)}.`);
    }

    socket.on('card:moved', onCardMoved);
    socket.on('list:moved', onListMoved);

    return () => {
      socket.off('card:moved', onCardMoved);
      socket.off('list:moved', onListMoved);
    };
  }, [currentUserId, visibleListIds]);

  return message;
}
