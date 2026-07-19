'use client';

import type { Card, List } from '@todoapp/shared';
import { SortableKeyboardPlugin } from '@dnd-kit/dom/sortable';
import { useSortable } from '@dnd-kit/react/sortable';
import { ClockIcon, MoveIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const dueDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// FR19: cards reorder within/across Lists via drag (pointer + keyboard, via
// dnd-kit's KeyboardSensor on the whole card — Space/Enter to pick up, arrow
// keys to move, Esc to cancel). `group` scopes the sortable to its owning
// List so cross-list drags resolve via board-lists.tsx's live onDragOver.
//
// UX §7 mobile fallback: cross-list drag isn't reliable on a single-list-at-
// a-time mobile layout, so "Move to list…" gives an explicit, non-drag path
// to the same moveCard mutation.
export function CardItem({
  card,
  index,
  listId,
  otherLists,
  onMoveToList,
}: {
  card: Card;
  index: number;
  listId: string;
  otherLists: List[];
  onMoveToList: (cardId: string, targetListId: string) => void;
}) {
  const { ref, isDragging } = useSortable({
    id: card.id,
    index,
    type: 'card',
    accept: 'card',
    group: listId,
    // dnd-kit's default OptimisticSortingPlugin reorders the real DOM nodes
    // itself, live, during a cross-List drag — which raced React's own
    // reconciliation for the same nodes (once state updated on drop) and
    // crashed with a `removeChild` DOM error. Board-lists.tsx's onDragOver
    // now owns all live reordering via React state instead, so this is the
    // only plugin left enabled (keyboard pick-up/move/drop stays intact).
    plugins: [SortableKeyboardPlugin],
  });

  return (
    <div
      ref={ref}
      tabIndex={0}
      className="group flex cursor-grab flex-col gap-1 rounded-md bg-background px-2.5 py-2 text-sm text-foreground shadow-sm outline-none ring-1 ring-foreground/10 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 flex-1 break-words">{card.title}</span>
        {otherLists.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 outline-none hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
              aria-label="Move to list"
            >
              <MoveIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {otherLists.map((list) => (
                <DropdownMenuItem key={list.id} onClick={() => onMoveToList(card.id, list.id)}>
                  {list.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {/* FR23 card face preview: due date is the only piece of this preview
          with real backing data right now (Card.dueDate, Story 3.1's schema)
          — labels/assignees/checklists/comments/attachments have no data
          model yet (Epic 4), so they're left off rather than rendered empty. */}
      {card.dueDate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon className="size-3" />
          {dueDateFormatter.format(new Date(card.dueDate))}
        </div>
      )}
    </div>
  );
}
