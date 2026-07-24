'use client';

import type { Card, List } from '@todoapp/shared';
import { KeyboardSensor, PointerSensor } from '@dnd-kit/dom';
import { SortableKeyboardPlugin } from '@dnd-kit/dom/sortable';
import { useSortable } from '@dnd-kit/react/sortable';
import { ListChecksIcon, MessageSquareIcon, MoveIcon, PaperclipIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarStack } from '@/components/ui/person-avatar';
import { DUE_STATUS_PRESENTATION, getDueStatus } from '@/lib/due-date-status';
import { cn } from '@/lib/utils';
import { LabelDot } from './label-badge';

const dueDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// FR19: cards reorder within/across Lists via drag (pointer + keyboard, via
// dnd-kit's KeyboardSensor on the whole card — Space to pick up, arrow keys
// to move, Esc to cancel). `group` scopes the sortable to its owning List so
// cross-list drags resolve via board-lists.tsx's live onDragOver.
//
// Story 8.4 accessibility audit: dnd-kit's KeyboardSensor default also treats
// Enter as a start/end key, but this card's own onKeyDown already claims
// Enter to open Card Detail (below) — and since dnd-kit's native listener
// fires before React's synthetic one, Enter silently started an invisible
// drag instead of ever reaching onOpen, confirmed via a real keyboard-driven
// Playwright run. Per-draggable `sensors` below overrides just the
// start/end keys to drop Enter, restoring "Enter opens the card" and
// leaving Space as the sole pick-up/drop key for cards specifically (List
// dragging, list-column.tsx, keeps the KeyboardSensor default unchanged —
// it has no such conflict).
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
  isDimmed,
}: {
  card: Card;
  index: number;
  listId: string;
  otherLists: List[];
  onMoveToList: (cardId: string, targetListId: string) => void;
  onOpen: (cardId: string) => void;
  isHighlighted: boolean;
  isDimmed: boolean;
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
    // only sorting plugin left enabled (keyboard pick-up/move/drop stays
    // intact).
    //
    // Story 8.4 accessibility audit: a second, independent source of the
    // exact same `removeChild` crash class remained even with
    // OptimisticSortingPlugin off — the default Feedback plugin (always
    // active, part of dnd-kit's core) inserts its own "hidden placeholder"
    // DOM node directly into the list on every drag, outside React's
    // knowledge, which could then desync from React's own reconciliation of
    // the same list (reproduced via a real keyboard cross-list move in
    // Playwright, ~40% of runs, confirmed present before this story's
    // changes too — not a regression). Fixed by rendering a real
    // `<DragOverlay>` in board-lists.tsx instead — dnd-kit skips placeholder
    // creation entirely whenever an overlay is present (the officially
    // documented way to opt out, per Feedback.ts), and leaves the original
    // source element untouched in the DOM meanwhile — no plugin override
    // needed here. (An earlier attempt at `Feedback.configure({feedback:
    // 'move'})` also avoided the placeholder, but that also applies its own
    // CSS transform to the original element, which measurably conflicted
    // with this app's own state+FLIP-driven reordering and made a single
    // ArrowDown move the card two slots instead of one — reverted.)
    plugins: [SortableKeyboardPlugin],
    // Per-draggable override (takes precedence over DragDropProvider's
    // global sensors, board-lists.tsx) — same PointerSensor config as the
    // global default, but KeyboardSensor drops 'Enter' from start/end (see
    // comment above).
    sensors: [
      PointerSensor.configure({
        activatorElements: (source) => [source.element, source.handle],
      }),
      KeyboardSensor.configure({
        keyboardCodes: {
          start: ['Space'],
          cancel: ['Escape'],
          end: ['Space'],
          up: ['ArrowUp'],
          down: ['ArrowDown'],
          left: ['ArrowLeft'],
          right: ['ArrowRight'],
        },
      }),
    ],
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
      className="group flex cursor-grab flex-col gap-1.5 rounded-md border border-neutral-200 bg-card px-3 py-2.5 text-sm text-foreground shadow-card outline-none transition-[box-shadow,border-color] duration-150 hover:border-neutral-300 hover:shadow-hover active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        // FR38/UX §4.2 "dims ... non-matching cards in place (no layout
        // jump/reload)": opacity-only, never removed from the DOM/flow, so
        // filtering never shifts other cards' positions or interferes with
        // dnd-kit's own isDragging opacity above (drag always wins).
        opacity: isDragging ? 0.5 : isDimmed ? 0.35 : 1,
        // UX §6 "soft colored outline, ~1.5s fade": appears instantly when a
        // live update lands (useBoardLiveUpdates), then this transition
        // fades it back out once that hook drops the id from its set.
        boxShadow: isDragging
          ? 'var(--shadow-drag)'
          : isHighlighted
            ? '0 0 0 2px var(--accent-300), var(--shadow-card)'
            : undefined,
        transform: isDragging ? 'rotate(1.5deg)' : undefined,
        transition: 'box-shadow 1.5s ease-out, opacity 150ms ease-out, border-color 150ms ease-out',
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 flex-1 break-words font-medium text-foreground">{card.title}</span>
        {otherLists.length > 0 && (
          // Stops the click from bubbling to the outer div's onOpen — the
          // menu is its own affordance, not an entry point into Card Detail.
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-0 outline-none hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
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
      {/* FR23/FR27/FR28/FR29 card face preview, UX §4.2 order (labels, due
          date, assignees, checklist progress, comment count, attachment
          count). */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((label) => (
            <LabelDot key={label.id} label={label} />
          ))}
        </div>
      )}
      {(() => {
        const totalItems = card.checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
        const commentCount = card.comments.length;
        const attachmentCount = card.attachments.length;
        const checkedItems = card.checklists.reduce(
          (sum, checklist) => sum + checklist.items.filter((item) => item.isChecked).length,
          0,
        );
        const hasMeta =
          card.dueDate || totalItems > 0 || commentCount > 0 || attachmentCount > 0 || card.assignees.length > 0;
        if (!hasMeta) return null;
        const status = card.dueDate ? getDueStatus(card.dueDate)! : null;
        return (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
            {status &&
              (() => {
                const { icon: StatusIcon, fg, bg, border, label } = DUE_STATUS_PRESENTATION[status];
                return (
                  <div
                    className={cn(
                      'inline-flex w-fit items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold',
                      fg,
                      bg,
                      border,
                    )}
                  >
                    <StatusIcon className="size-3" />
                    <span className="sr-only">{label}: </span>
                    {dueDateFormatter.format(new Date(card.dueDate!))}
                  </div>
                );
              })()}
            {totalItems > 0 && (
              <div
                className={cn(
                  'flex items-center gap-1 text-[12px] font-medium text-muted-foreground',
                  checkedItems === totalItems && 'text-success-fg',
                )}
              >
                <ListChecksIcon className="size-3.5" />
                {checkedItems}/{totalItems}
              </div>
            )}
            {commentCount > 0 && (
              <div className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                <MessageSquareIcon className="size-3.5" />
                {commentCount}
              </div>
            )}
            {attachmentCount > 0 && (
              <div className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                <PaperclipIcon className="size-3.5" />
                {attachmentCount}
              </div>
            )}
            <span className="flex-1" />
            {card.assignees.length > 0 && (
              <AvatarStack people={card.assignees} keyOf={(assignee) => assignee.id} max={3} size="sm" />
            )}
          </div>
        );
      })()}
    </div>
  );
}
