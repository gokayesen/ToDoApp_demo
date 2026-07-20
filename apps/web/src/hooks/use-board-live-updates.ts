'use client';

import type {
  Card,
  CardCreatedEvent,
  CardDeletedEvent,
  CardMovedEvent,
  CardUpdatedEvent,
  List,
  ListCreatedEvent,
  ListDeletedEvent,
  ListMovedEvent,
  ListUpdatedEvent,
} from '@todoapp/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { getSocket } from '@/lib/socket-client';

// Exported so card-detail.tsx (Story 5.5) can flash its own per-field
// highlight for the same duration, matching UX §6's "same brief highlight
// treatment" wording for live edits inside an open Card Detail.
export const HIGHLIGHT_MS = 1500;

function upsertSorted<T extends { id: string; position: number }>(list: T[], entity: T): T[] {
  return [...list.filter((item) => item.id !== entity.id), entity].sort(
    (a, b) => a.position - b.position,
  );
}

// Story 5.4: merges Story 5.3's broadcast events straight into the TanStack
// Query cache board-lists.tsx already reads from (['lists', boardId],
// ['cards', listId]) — its existing effects re-sync local component state
// from that cache automatically on any change, so nothing else has to know
// a live update happened for the board to reflect it.
//
// Returns the set of entity ids that just changed via *someone else's*
// action, for the brief highlight-fade UX §6 asks for. created/updated/
// deleted events don't carry an actor id (nothing needs it yet), so those
// always highlight, including this client's own — a minor, harmless
// cosmetic quirk against the alternative of threading an actor id through
// every mutation for a highlight that mostly fires correctly either way.
// moved events do carry `movedBy` and skip the highlight when it's this
// client's own drag, since dnd-kit's live drag transform already gives that
// its own feedback.
export function useBoardLiveUpdates(boardId: string, currentUserId: string): Set<string> {
  const queryClient = useQueryClient();
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timerMap = timers.current;

    function highlight(id: string) {
      setHighlighted((current) => new Set(current).add(id));
      const existing = timerMap.get(id);
      if (existing) clearTimeout(existing);
      timerMap.set(
        id,
        setTimeout(() => {
          setHighlighted((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
          timerMap.delete(id);
        }, HIGHLIGHT_MS),
      );
    }

    const socket = getSocket();

    function onListCreated({ list }: ListCreatedEvent) {
      queryClient.setQueryData<List[]>(['lists', boardId], (current) =>
        current ? upsertSorted(current, list) : current,
      );
      highlight(list.id);
    }

    function onListUpdated({ list }: ListUpdatedEvent) {
      queryClient.setQueryData<List[]>(['lists', boardId], (current) => {
        if (!current) return current;
        return list.isArchived
          ? current.filter((l) => l.id !== list.id)
          : upsertSorted(current, list);
      });
      highlight(list.id);
    }

    function onListMoved({ list, movedBy }: ListMovedEvent) {
      queryClient.setQueryData<List[]>(['lists', boardId], (current) =>
        current ? upsertSorted(current, list) : current,
      );
      if (movedBy !== currentUserId) highlight(list.id);
    }

    function onListDeleted({ listId }: ListDeletedEvent) {
      queryClient.setQueryData<List[]>(['lists', boardId], (current) =>
        current?.filter((l) => l.id !== listId),
      );
    }

    function onCardCreated({ card }: CardCreatedEvent) {
      queryClient.setQueryData<Card[]>(['cards', card.listId], (current) =>
        current ? upsertSorted(current, card) : current,
      );
      highlight(card.id);
    }

    function onCardUpdated({ card }: CardUpdatedEvent) {
      queryClient.setQueryData<Card[]>(['cards', card.listId], (current) => {
        if (!current) return current;
        return card.isArchived
          ? current.filter((c) => c.id !== card.id)
          : upsertSorted(current, card);
      });
      highlight(card.id);
    }

    function onCardMoved({ card, movedBy }: CardMovedEvent) {
      // A move can change which List a Card belongs to — the old List's
      // cards query is a *different* cache entry than the new one, so every
      // mounted `['cards', *]` query needs checking, not just the target.
      queryClient.getQueriesData<Card[]>({ queryKey: ['cards'] }).forEach(([key, data]) => {
        const listId = key[1] as string;
        if (!data || listId === card.listId) return;
        if (data.some((c) => c.id === card.id)) {
          queryClient.setQueryData<Card[]>(
            key,
            data.filter((c) => c.id !== card.id),
          );
        }
      });
      queryClient.setQueryData<Card[]>(['cards', card.listId], (current) =>
        current ? upsertSorted(current, card) : current,
      );
      if (movedBy !== currentUserId) highlight(card.id);
    }

    function onCardDeleted({ cardId, listId }: CardDeletedEvent) {
      queryClient.setQueryData<Card[]>(['cards', listId], (current) =>
        current?.filter((c) => c.id !== cardId),
      );
    }

    socket.on('list:created', onListCreated);
    socket.on('list:updated', onListUpdated);
    socket.on('list:moved', onListMoved);
    socket.on('list:deleted', onListDeleted);
    socket.on('card:created', onCardCreated);
    socket.on('card:updated', onCardUpdated);
    socket.on('card:moved', onCardMoved);
    socket.on('card:deleted', onCardDeleted);

    return () => {
      socket.off('list:created', onListCreated);
      socket.off('list:updated', onListUpdated);
      socket.off('list:moved', onListMoved);
      socket.off('list:deleted', onListDeleted);
      socket.off('card:created', onCardCreated);
      socket.off('card:updated', onCardUpdated);
      socket.off('card:moved', onCardMoved);
      socket.off('card:deleted', onCardDeleted);
      timerMap.forEach((timer) => clearTimeout(timer));
      timerMap.clear();
    };
  }, [boardId, currentUserId, queryClient]);

  return highlighted;
}
