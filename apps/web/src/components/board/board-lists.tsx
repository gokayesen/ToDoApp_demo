'use client';

import type { Card, List } from '@todoapp/shared';
import { Accessibility, KeyboardSensor, PointerSensor } from '@dnd-kit/dom';
import { move } from '@dnd-kit/helpers';
import { DragDropProvider, DragOverlay, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useBoardLiveUpdates } from '@/hooks/use-board-live-updates';
import { useFlipAnimation } from '@/hooks/use-flip-animation';
import { useLiveMoveAnnouncements } from '@/hooks/use-live-move-announcements';
import { useOutOfViewToasts } from '@/hooks/use-out-of-view-toasts';
import { usePresence } from '@/hooks/use-presence';
import { useVisibleListIds } from '@/hooks/use-visible-list-ids';
import { cardMatchesFilters, EMPTY_CARD_FILTERS, type CardFilters } from '@/lib/card-filters';
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
  filters = EMPTY_CARD_FILTERS,
}: {
  boardId: string;
  boardName: string;
  lists: List[];
  currentUserId: string;
  filters?: CardFilters;
}) {
  const [orderedLists, setOrderedLists] = useState(lists);
  const [cardsByList, setCardsByList] = useState<CardsByList>({});
  const [isDragging, setIsDragging] = useState(false);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const highlightedIds = useBoardLiveUpdates(boardId, currentUserId);
  // FR38: recomputed straight off cardsByList every render — cheap relative
  // to the DnD/animation work already happening here, and naturally empty
  // when `filters` is EMPTY_CARD_FILTERS (every card matches an empty filter).
  const dimmedIds = new Set(
    Object.values(cardsByList)
      .flat()
      .filter((card) => !cardMatchesFilters(card, filters))
      .map((card) => card.id),
  );

  const flipContainerRef = useRef<HTMLDivElement>(null);
  const visibleListIds = useVisibleListIds(flipContainerRef);
  const presence = usePresence(boardId);
  const { toasts, dismiss } = useOutOfViewToasts(
    currentUserId,
    visibleListIds,
    presence,
    orderedLists,
  );
  const moveAnnouncement = useLiveMoveAnnouncements(currentUserId, visibleListIds, presence, orderedLists);

  // UX §8 "keyboard DnD": dnd-kit's default Accessibility plugin (included in
  // `defaults`, so already on) announces pick-up/drop to screen readers, but
  // its default message names the dragged entity by its raw `source.id` —
  // which is a card/list UUID here (useSortable's `id` in
  // card-item.tsx/list-column.tsx), meaningless read aloud. Override with the
  // actual card title / list name. `describe` closes over the current
  // cardsByList/orderedLists — recreating this small array each render is
  // negligible next to the DnD/animation work this component already does.
  function describeDraggable(entity: { id: PropertyKey; type?: unknown }): string {
    const id = String(entity.id);
    if (entity.type === 'list') {
      const list = orderedLists.find((l) => l.id === id);
      return `list "${list?.name ?? id}"`;
    }
    const card = Object.values(cardsByList)
      .flat()
      .find((c) => c.id === id);
    return `card "${card?.title ?? id}"`;
  }

  // Renders whatever is currently being dragged inside <DragOverlay> below —
  // this is *why* the Feedback plugin skips its own hidden-placeholder DOM
  // insertion for every draggable in this provider (see the removeChild
  // crash comment in card-item.tsx's useSortable call): with a DragOverlay
  // present, dnd-kit leaves the original source element untouched in the DOM
  // and lets this floating clone represent the drag instead. A plain visual
  // clone, not the real CardItem/ListColumn (which carry their own
  // interactive dropdowns/handles that have no business existing twice).
  function renderDragOverlayContent(source: { id: PropertyKey; type?: unknown }) {
    const id = String(source.id);
    if (source.type === 'list') {
      const list = orderedLists.find((l) => l.id === id);
      if (!list) return null;
      return (
        <div
          className="w-72 rounded-md border border-neutral-200/80 bg-neutral-100/90 p-2 backdrop-blur-sm"
          style={{ boxShadow: 'var(--shadow-drag)', transform: 'rotate(1.5deg)' }}
        >
          <div className="truncate px-1 py-1 text-[15px] font-semibold text-foreground">{list.name}</div>
        </div>
      );
    }
    const card = Object.values(cardsByList)
      .flat()
      .find((c) => c.id === id);
    if (!card) return null;
    return (
      <div
        className="max-w-64 rounded-md border border-neutral-200 bg-card px-3 py-2.5 text-sm font-medium text-foreground"
        style={{ boxShadow: 'var(--shadow-drag)', transform: 'rotate(1.5deg)' }}
      >
        {card.title}
      </div>
    );
  }

  const flipKey =
    orderedLists.map((list) => list.id).join(',') +
    '|' +
    orderedLists
      .map((list) => (cardsByList[list.id] ?? []).map((card) => card.id).join(','))
      .join(';');
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
    mutationFn: (input: {
      listId: string;
      afterListId: string | null;
      beforeListId: string | null;
    }) =>
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
    mutationFn: (input: {
      cardId: string;
      listId: string;
      afterCardId: string | null;
      beforeCardId: string | null;
    }) =>
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
    if (event.canceled) {
      // Cards disable dnd-kit's own OptimisticSortingPlugin (useSortable
      // comment in card-item.tsx — it crashed on cross-List drags), so their
      // live reorder during the drag is applied directly into cardsByList by
      // handleDragOver above instead of dnd-kit's own DOM plugin. That plugin
      // would normally snap the DOM back on a canceled drag for free; since
      // cards opt out of it, a cancel must revert this React state by hand
      // or the card is left showing its rejected mid-drag position (found via
      // a real keyboard Escape-cancel in Playwright, Story 8.4 audit) — Lists
      // keep the default plugin, which already reverts on its own.
      if (event.operation.source?.type === 'card') {
        setCardsByList(serverCardsByList);
      }
      return;
    }
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
      moveCardMutation.mutate({
        cardId: String(movedId),
        listId: targetListId,
        afterCardId,
        beforeCardId,
      });
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
  const openCardList = openCardEntry
    ? (orderedLists.find((list) => list.id === openCardEntry[0]) ?? null)
    : null;

  return (
    // `contents` keeps this a transparent pass-through in the parent's flex
    // layout (board page's list row) while still giving use-flip-animation a
    // DOM node to scope its querySelectorAll to.
    <div ref={flipContainerRef} className="contents">
      <DragDropProvider
        sensors={sensors}
        plugins={(defaults) => [
          ...defaults,
          Accessibility.configure({
            announcements: {
              dragstart({ operation: { source } }: DragStartEvent) {
                if (!source) return;
                return `Picked up ${describeDraggable(source)}.`;
              },
              dragend({ operation: { source }, canceled }: DragEndEvent) {
                if (!source) return;
                return canceled
                  ? `Cancelled dragging ${describeDraggable(source)}.`
                  : `Dropped ${describeDraggable(source)}.`;
              },
            },
          }),
        ]}
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
            dimmedIds={dimmedIds}
          />
        ))}
        <AddListForm boardId={boardId} />
        <DragOverlay>{(source) => renderDragOverlayContent(source)}</DragOverlay>
      </DragDropProvider>
      <BoardToasts toasts={toasts} onDismiss={dismiss} />
      {/* UX §8: screen-reader-only live region for remote card/list moves
          landing somewhere already visible (use-live-move-announcements.ts);
          the sighted-only highlight-fade above (useBoardLiveUpdates) has no
          screen-reader equivalent otherwise. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {moveAnnouncement}
      </div>
      <CardDetail
        card={openCard}
        list={openCardList}
        boardId={boardId}
        boardName={boardName}
        currentUserId={currentUserId}
        otherLists={openCardList ? orderedLists.filter((l) => l.id !== openCardList.id) : []}
        onMoveToList={handleMoveToList}
        open={openCardId !== null}
        onOpenChange={(next) => {
          if (!next) setOpenCardId(null);
        }}
      />
    </div>
  );
}
