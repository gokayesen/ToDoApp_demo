'use client';

import type { Card, List } from '@todoapp/shared';
import { useSortable } from '@dnd-kit/react/sortable';
import { MoreHorizontalIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArchiveListDialog } from './archive-list-dialog';
import { CardItem } from './card-item';
import { QuickAddCardForm } from './quick-add-card-form';

// UX §4.2: a vertical column with a name header, its Cards, and the Story 3.4
// quick-add affordance at the bottom. Card face preview enrichment (labels,
// due date, etc.) arrives with Story 3.9.
//
// UX §5 "lists reorder via drag on their header": the header is the sortable
// handle (not the whole column), so dragging never conflicts with clicking
// cards or the quick-add form below it. Cards and Lists share one drag
// context (board-lists.tsx) distinguished by `type`; `accept: ['list', 'card']`
// lets this column's own sortable region double as the cross-list drop target
// for an empty list (Story 3.6, FR19) since it has no Card of its own to
// collide against.
export function ListColumn({
  boardId,
  list,
  index,
  cards,
  isLoading,
  otherLists,
  onMoveToList,
  onOpenCard,
  highlightedIds,
  dimmedIds,
}: {
  boardId: string;
  list: List;
  index: number;
  cards: Card[];
  isLoading: boolean;
  otherLists: List[];
  onMoveToList: (cardId: string, targetListId: string) => void;
  onOpenCard: (cardId: string) => void;
  highlightedIds: Set<string>;
  dimmedIds: Set<string>;
}) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLHeadingElement>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const { isDragging } = useSortable({
    id: list.id,
    index,
    type: 'list',
    accept: ['list', 'card'],
    element,
    handle: handleRef,
  });

  return (
    <div
      ref={setElement}
      data-flip-id={list.id}
      data-list-id={list.id}
      className="flex w-[288px] shrink-0 flex-col gap-2 rounded-md border border-neutral-200/80 bg-neutral-100/70 p-2 backdrop-blur-sm"
      style={{
        opacity: isDragging ? 0.5 : 1,
        boxShadow: highlightedIds.has(list.id) ? '0 0 0 2px var(--accent-300)' : undefined,
        transition: 'box-shadow 1.5s ease-out',
      }}
    >
      <div className="flex items-center gap-1 px-1 py-1">
        <h3
          ref={handleRef}
          tabIndex={0}
          className="min-w-0 cursor-grab truncate text-[15px] font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          {list.name}
        </h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-200 px-1.5 text-xs font-semibold text-neutral-600">
          {cards.length}
        </span>
        <span className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger
            className="shrink-0 rounded-sm p-1 text-muted-foreground outline-none hover:bg-neutral-200/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${list.name} list menu`}
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)}>Archive list</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ArchiveListDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        boardId={boardId}
        listId={list.id}
        listName={list.name}
        cardCount={cards.length}
      />
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <p className="px-1 text-sm text-muted-foreground">Loading…</p>
        ) : (
          cards.map((card, cardIndex) => (
            <CardItem
              key={card.id}
              card={card}
              index={cardIndex}
              listId={list.id}
              otherLists={otherLists}
              onMoveToList={onMoveToList}
              onOpen={onOpenCard}
              isHighlighted={highlightedIds.has(card.id)}
              isDimmed={dimmedIds.has(card.id)}
            />
          ))
        )}
      </div>
      <QuickAddCardForm listId={list.id} />
    </div>
  );
}
