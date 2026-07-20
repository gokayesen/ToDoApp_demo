'use client';

import type {
  CardCreatedEvent,
  CardMovedEvent,
  List,
  ListCreatedEvent,
  PresenceMember,
} from '@todoapp/shared';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { getSocket } from '@/lib/socket-client';

const TOAST_MS = 4000;

export interface BoardToast {
  id: string;
  message: string;
}

// Story 5.7 (UX §6): Story 5.4's highlight-fade already signals an on-screen
// change; this covers the case where a change lands somewhere the user
// isn't currently scrolled to, so nothing on screen would otherwise hint at
// it. Scoped to the two events worth interrupting a scrolled-away user for
// — a new List (always shown, there's no prior element to check visibility
// against) and a Card landing in an out-of-view List (created or moved
// there). Skips this client's own actions the same way Story 5.4 does.
export function useOutOfViewToasts(
  currentUserId: string,
  visibleListIds: RefObject<Set<string>>,
  presence: PresenceMember[],
  lists: List[],
): { toasts: BoardToast[]; dismiss: (id: string) => void } {
  const [toasts, setToasts] = useState<BoardToast[]>([]);
  const presenceRef = useRef(presence);
  presenceRef.current = presence;
  const listsRef = useRef(lists);
  listsRef.current = lists;

  function dismiss(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  useEffect(() => {
    function actorName(actorId: string): string {
      return presenceRef.current.find((member) => member.userId === actorId)?.name ?? 'Someone';
    }

    function listName(listId: string): string {
      return listsRef.current.find((list) => list.id === listId)?.name ?? 'a list';
    }

    function push(message: string) {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message }]);
      setTimeout(() => dismiss(id), TOAST_MS);
    }

    const socket = getSocket();

    function onListCreated({ list, actorId }: ListCreatedEvent) {
      if (actorId === currentUserId) return;
      push(`${actorName(actorId)} added a list: ${list.name}`);
    }

    function onCardCreated({ card, actorId }: CardCreatedEvent) {
      if (actorId === currentUserId) return;
      if (visibleListIds.current.has(card.listId)) return;
      push(`${actorName(actorId)} added a card to ${listName(card.listId)}`);
    }

    function onCardMoved({ card, movedBy }: CardMovedEvent) {
      if (movedBy === currentUserId) return;
      if (visibleListIds.current.has(card.listId)) return;
      push(`${actorName(movedBy)} moved a card to ${listName(card.listId)}`);
    }

    socket.on('list:created', onListCreated);
    socket.on('card:created', onCardCreated);
    socket.on('card:moved', onCardMoved);

    return () => {
      socket.off('list:created', onListCreated);
      socket.off('card:created', onCardCreated);
      socket.off('card:moved', onCardMoved);
    };
  }, [currentUserId, visibleListIds]);

  return { toasts, dismiss };
}
