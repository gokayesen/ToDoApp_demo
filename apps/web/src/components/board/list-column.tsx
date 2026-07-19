'use client';

import type { List } from '@todoapp/shared';
import { useQuery } from '@tanstack/react-query';

import { listCards } from '@/lib/board-api';
import { CardItem } from './card-item';
import { QuickAddCardForm } from './quick-add-card-form';

// UX §4.2: a vertical column with a name header, its Cards, and the Story 3.4
// quick-add affordance at the bottom. Card face preview enrichment (labels,
// due date, etc.) arrives with Story 3.9.
export function ListColumn({ list }: { list: List }) {
  const { data: cards, isLoading } = useQuery({
    queryKey: ['cards', list.id],
    queryFn: () => listCards(list.id),
  });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted p-2">
      <h3 className="truncate px-1 py-1 text-sm font-medium text-foreground">{list.name}</h3>
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
