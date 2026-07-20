'use client';

import type { Card, List } from '@todoapp/shared';
import { SortableKeyboardPlugin } from '@dnd-kit/dom/sortable';
import { useSortable } from '@dnd-kit/react/sortable';
import { AlertTriangleIcon, CalendarIcon, ClockIcon, ListChecksIcon, MoveIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarStack } from '@/components/ui/person-avatar';
import { getDueStatus } from '@/lib/due-date-status';
import { cn } from '@/lib/utils';
import { LabelDot } from './label-badge';

const dueDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// FR25 / UX §8 "color is never the only signal": each due-date status pairs
// its own color with its own icon shape and an sr-only text label, not just a
// color swap on a shared icon.
const DUE_STATUS_PRESENTATION = {
  overdue: { icon: AlertTriangleIcon, className: 'text-red-600 dark:text-red-400', label: 'Overdue' },
  'due-soon': { icon: ClockIcon, className: 'text-amber-600 dark:text-amber-400', label: 'Due soon' },
  'on-track': { icon: CalendarIcon, className: 'text-muted-foreground', label: 'Due' },
} as const;

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
  onOpen,
  isHighlighted,
}: {
  card: Card;
  index: number;
  listId: string;
  otherLists: List[];
  onMoveToList: (cardId: string, targetListId: string) => void;
  onOpen: (cardId: string) => void;
  isHighlighted: boolean;
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
      data-flip-id={card.id}
      tabIndex={0}
      onClick={() => onOpen(card.id)}
      onKeyDown={(event) => {
        // Space is reserved for dnd-kit's keyboard drag pick-up (see comment
        // above); Enter opens the Card Detail instead, mirroring the
        // click-to-open mouse behavior.
        if (event.key === 'Enter') onOpen(card.id);
      }}
      className="group flex cursor-grab flex-col gap-1 rounded-md bg-background px-2.5 py-2 text-sm text-foreground shadow-sm outline-none ring-1 ring-foreground/10 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        opacity: isDragging ? 0.5 : 1,
        // UX §6 "soft colored outline, ~1.5s fade": appears instantly when a
        // live update lands (useBoardLiveUpdates), then this transition
        // fades it back out once that hook drops the id from its set.
        boxShadow: isHighlighted ? '0 0 0 2px var(--color-primary)' : '0 0 0 2px transparent',
        transition: 'box-shadow 1.5s ease-out',
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 flex-1 break-words">{card.title}</span>
        {otherLists.length > 0 && (
          // Stops the click from bubbling to the outer div's onOpen — the
          // menu is its own affordance, not an entry point into Card Detail.
          <div onClick={(event) => event.stopPropagation()}>
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
          </div>
        )}
      </div>
      {/* FR23/FR27 card face preview, UX §4.2 order (labels, due date,
          assignees, checklist progress): comments/attachments still have no
          data model (later Epic 4 stories), so they're left off rather than
          rendered empty. */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <LabelDot key={label.id} label={label} />
          ))}
        </div>
      )}
      {card.dueDate &&
        (() => {
          const status = getDueStatus(card.dueDate)!;
          const { icon: StatusIcon, className, label } = DUE_STATUS_PRESENTATION[status];
          return (
            <div className={`flex items-center gap-1 text-xs ${className}`}>
              <StatusIcon className="size-3" />
              <span className="sr-only">{label}: </span>
              {dueDateFormatter.format(new Date(card.dueDate))}
            </div>
          );
        })()}
      {card.assignees.length > 0 && (
        <AvatarStack people={card.assignees} keyOf={(assignee) => assignee.id} max={3} size="sm" />
      )}
      {(() => {
        const totalItems = card.checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
        if (totalItems === 0) return null;
        const checkedItems = card.checklists.reduce(
          (sum, checklist) => sum + checklist.items.filter((item) => item.isChecked).length,
          0,
        );
        return (
          <div
            className={cn(
              'flex w-fit items-center gap-1 rounded px-1 text-xs text-muted-foreground',
              checkedItems === totalItems && 'bg-primary/10 text-primary',
            )}
          >
            <ListChecksIcon className="size-3" />
            {checkedItems}/{totalItems}
          </div>
        );
      })()}
    </div>
  );
}
