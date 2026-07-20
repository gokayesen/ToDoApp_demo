'use client';

import type { Card, List } from '@todoapp/shared';
import { KeyboardSensor, PointerSensor } from '@dnd-kit/dom';
import { move } from '@dnd-kit/helpers';
import { DragDropProvider, type DragEndEvent, type DragOverEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useBoardLiveUpdates } from '@/hooks/use-board-live-updates';
import { useFlipAnimation } from '@/hooks/use-flip-animation';
import { useOutOfViewToasts } from '@/hooks/use-out-of-view-toasts';
import { usePresence } from '@/hooks/use-presence';
import { useVisibleListIds } from '@/hooks/use-visible-list-ids';
import { listCards, moveCard, moveList } from '@/lib/board-api';
import { AddListForm } from './add-list-form';
import { BoardToasts } from './board-toasts';
import { CardDetail } from './card-detail';
import { ListColumn } from './list-column';

const sensors = [
  PointerSensor.configure({
    activatorElements: (source) => [source.element, source.handle],
  }),
  KeyboardSensor,
];

type CardsByList = Record<string, Card[]>;

// UX §5 "lists reorder via drag on their header", FR19 "cards reorder within
// and across lists": both live under a single DragDropProvider, distinguished
// by the sortable `type` ('list' vs 'card') set in ListColumn/CardItem. Lists
// keep dnd-kit's default OptimisticSortingPlugin (live native DOM reorder,
// state only committed on `onDragEnd`). Cards disable that plugin instead
// (card-item.tsx) — it reorders the real DOM node itself during a cross-List
// drag, which raced React's own reconciliation once state updated on drop
// and crashed with a `removeChild` DOM error — so Card reordering is driven
// entirely by React state instead, live, via `onDragOver`.
export function BoardLists({
  boardId,
  boardName,
  lists,
  currentUserId,
}: {
  boardId: string;
  boardName: string;
  lists: List[];
  currentUserId: string;
}) {
  const [orderedLists, setOrderedLists] = useState(lists);
  const [cardsByList, setCardsByList] = useState<CardsByList>({});
  const [isDragging, setIsDragging] = useState(false);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const highlightedIds = useBoardLiveUpdates(boardId, currentUserId);

  const flipContainerRef = useRef<HTMLDivElement>(null);
  const visibleListIds = useVisibleListIds(flipContainerRef);
  const presence = usePresence(boardId);
  const { toasts, dismiss } = useOutOfViewToasts(currentUserId, visibleListIds, presence, orderedLists);
  const flipKey =
    orderedLists.map((list) => list.id).join(',') +
    '|' +
    orderedLists.map((list) => (cardsByList[list.id] ?? []).map((card) => card.id).join(',')).join(';');
  // Skip animating this client's own active drag — dnd-kit already gives
  // that its own live per-frame transform (use-flip-animation.ts).
  useFlipAnimation(flipContainerRef, flipKey, !isDragging);

  useEffect(() => {
    setOrderedLists(lists);
  }, [lists]);

  const cardQueries = useQueries({
    queries: lists.map((list) => ({
      queryKey: ['cards', list.id],
      queryFn: () => listCards(list.id),
    })),
  });
  const cardsLoading = cardQueries.some((q) => q.isLoading);

  const serverCardsByList: CardsByList = {};
  lists.forEach((list, index) => {
    serverCardsByList[list.id] = cardQueries[index]?.data ?? [];
  });
  // A single string, not a per-list spread — useEffect's dependency array
  // must stay a fixed length across renders, but the number of card queries
  // grows/shrinks with the number of Lists on the board.
  const cardsVersion = cardQueries.map((q) => q.dataUpdatedAt).join(',');

  useEffect(() => {
    setCardsByList(serverCardsByList);
    // Re-sync whenever the underlying query data changes (initial load,
    // invalidation after a mutation, etc.) — same "trust the server" rollback
    // target used for list reorder below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, cardsVersion]);

  const moveListMutation = useMutation({
    mutationFn: (input: { listId: string; afterListId: string | null; beforeListId: string | null }) =>
      moveList(input.listId, { afterListId: input.afterListId, beforeListId: input.beforeListId }),
    onError: () => {
      setOrderedLists(lists);
      queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: (input: { cardId: string; listId: string; afterCardId: string | null; beforeCardId: string | null }) =>
      moveCard(input.cardId, {
        listId: input.listId,
        afterCardId: input.afterCardId,
        beforeCardId: input.beforeCardId,
      }),
    onError: () => {
      // Server rejected the move (e.g. a stale neighbor) — revert to the last
      // known-good server state rather than trust the optimistic reorder.
      setCardsByList(serverCardsByList);
      lists.forEach((list) => queryClient.invalidateQueries({ queryKey: ['cards', list.id] }));
    },
    onSuccess: () => {
      // A move can change which List a Card belongs to, so both the source
      // and destination Lists' card queries need to refetch — invalidating
      // only the target left the source List's cache stale, showing the
      // Card in both places until an unrelated refetch happened to catch up.
      lists.forEach((list) => queryClient.invalidateQueries({ queryKey: ['cards', list.id] }));
    },
  });

  function handleDragOver(event: DragOverEvent) {
    const { source } = event.operation;
    if (!source || source.type !== 'card') return;
    setCardsByList((current) => move(current, event));
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!source) return;

    if (source.type === 'list') {
      const movedId = source.id;
      const next = move(orderedLists, event);
      setOrderedLists(next);

      const movedIndex = next.findIndex((list) => list.id === movedId);
      if (movedIndex === -1) return;
      const afterListId = next[movedIndex - 1]?.id ?? null;
      const beforeListId = next[movedIndex + 1]?.id ?? null;
      moveListMutation.mutate({ listId: String(movedId), afterListId, beforeListId });
      return;
    }

    if (source.type === 'card' && isSortable(source)) {
      const movedId = source.id;
      const next = move(cardsByList, event);
      setCardsByList(next);

      // Find the moved card's landing list directly in the mutated state
      // rather than trusting `source.group` — that prop only updates when a
      // Sortable it belongs to has a live neighbor to reconcile against, so
      // it's unreliable for the "dropped into an empty list" case, unlike
      // `move()`'s own target-id-based Record resolution above.
      const targetEntry = Object.entries(next).find(([, cards]) =>
        cards.some((card) => card.id === movedId),
      );
      if (!targetEntry) return;
      const [targetListId, targetCards] = targetEntry;
      const movedIndex = targetCards.findIndex((card) => card.id === movedId);
      if (movedIndex === -1) return;

      const afterCardId = targetCards[movedIndex - 1]?.id ?? null;
      const beforeCardId = targetCards[movedIndex + 1]?.id ?? null;
      moveCardMutation.mutate({ cardId: String(movedId), listId: targetListId, afterCardId, beforeCardId });
    }
  }

  // "Move to list…" mobile fallback (UX §7): moves a card to the end of a
  // different list without drag, for the off-screen cross-list case on the
  // single-list mobile board layout.
  function handleMoveToList(cardId: string, targetListId: string) {
    const sourceEntry = Object.entries(cardsByList).find(([, cards]) =>
      cards.some((card) => card.id === cardId),
    );
    if (!sourceEntry) return;
    const [sourceListId, sourceCards] = sourceEntry;
    if (sourceListId === targetListId) return;
    const card = sourceCards.find((c) => c.id === cardId)!;
    const targetCards = cardsByList[targetListId] ?? [];
    const afterCardId = targetCards.at(-1)?.id ?? null;

    setCardsByList((current) => ({
      ...current,
      [sourceListId]: (current[sourceListId] ?? []).filter((c) => c.id !== cardId),
      [targetListId]: [...(current[targetListId] ?? []), card],
    }));

    moveCardMutation.mutate({ cardId, listId: targetListId, afterCardId, beforeCardId: null });
  }

  const openCardEntry = openCardId
    ? Object.entries(cardsByList).find(([, cards]) => cards.some((card) => card.id === openCardId))
    : undefined;
  const openCard = openCardEntry?.[1].find((card) => card.id === openCardId) ?? null;
  const openCardList = openCardEntry ? (orderedLists.find((list) => list.id === openCardEntry[0]) ?? null) : null;

  return (
    // `contents` keeps this a transparent pass-through in the parent's flex
    // layout (board page's list row) while still giving use-flip-animation a
    // DOM node to scope its querySelectorAll to.
    <div ref={flipContainerRef} className="contents">
      <DragDropProvider
        sensors={sensors}
        onDragStart={() => setIsDragging(true)}
        onDragOver={handleDragOver}
        onDragEnd={(event) => {
          setIsDragging(false);
          handleDragEnd(event);
        }}
      >
        {orderedLists.map((list, index) => (
          <ListColumn
            key={list.id}
            boardId={boardId}
            list={list}
            index={index}
            cards={cardsByList[list.id] ?? []}
            isLoading={cardsLoading}
            otherLists={orderedLists.filter((l) => l.id !== list.id)}
            onMoveToList={handleMoveToList}
            onOpenCard={setOpenCardId}
            highlightedIds={highlightedIds}
          />
        ))}
        <AddListForm boardId={boardId} />
      </DragDropProvider>
      <BoardToasts toasts={toasts} onDismiss={dismiss} />
      <CardDetail
        card={openCard}
        list={openCardList}
        boardName={boardName}
        open={openCardId !== null}
        onOpenChange={(next) => {
          if (!next) setOpenCardId(null);
        }}
      />
    </div>
  );
}
