'use client';

import type { List } from '@todoapp/shared';
import { useSortable } from '@dnd-kit/react/sortable';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { listCards } from '@/lib/board-api';
import { CardItem } from './card-item';
import { QuickAddCardForm } from './quick-add-card-form';

// UX §4.2: a vertical column with a name header, its Cards, and the Story 3.4
// quick-add affordance at the bottom. Card face preview enrichment (labels,
// due date, etc.) arrives with Story 3.9.
//
// UX §5 "lists reorder via drag on their header": the header is the sortable
// handle (not the whole column), so dragging never conflicts with clicking
// cards or the quick-add form below it.
export function ListColumn({ list, index }: { list: List; index: number }) {
  const { data: cards, isLoading } = useQuery({
    queryKey: ['cards', list.id],
    queryFn: () => listCards(list.id),
  });

  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLHeadingElement>(null);
  const { isDragging } = useSortable({ id: list.id, index, element, handle: handleRef });

  return (
    <div
      ref={setElement}
      className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted p-2"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <h3
        ref={handleRef}
        tabIndex={0}
        className="cursor-grab truncate px-1 py-1 text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        {list.name}
      </h3>
      <div className="flex flex-col gap-2">
        {isLoading ? (
          <p className="px-1 text-sm text-muted-foreground">Loading…</p>
        ) : (
          cards?.map((card) => <CardItem key={card.id} card={card} />)
        )}
      </div>
      <QuickAddCardForm listId={list.id} />
    </div>
  );
}
