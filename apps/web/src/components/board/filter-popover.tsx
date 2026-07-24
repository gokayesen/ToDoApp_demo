'use client';

import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontalIcon } from 'lucide-react';

import { listBoardMembers, listLabels } from '@/lib/board-api';
import { activeFilterCount, EMPTY_CARD_FILTERS, type CardFilters } from '@/lib/card-filters';
import { LABEL_COLOR_HEX, LABEL_COLOR_TEXT } from '@/lib/label-colors';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PersonAvatar } from '@/components/ui/person-avatar';

// FR38/UX §4.2: "filter icon opening a filter popover (label/assignee/
// due-date)" in the Board header's right side, next to the presence avatar
// stack (board page.tsx). Toggle rows follow LabelPicker/AssigneePicker's own
// plain-<button> convention (not DropdownMenuItem) so a click toggles the
// filter without closing the popover, same reason those two never close on
// toggle either.
export function FilterPopover({
  boardId,
  filters,
  onChange,
}: {
  boardId: string;
  filters: CardFilters;
  onChange: (filters: CardFilters) => void;
}) {
  const { data: labels } = useQuery({ queryKey: ['labels', boardId], queryFn: () => listLabels(boardId) });
  const { data: members } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => listBoardMembers(boardId),
  });

  const count = activeFilterCount(filters);

  function toggleLabel(labelId: string) {
    const next = new Set(filters.labelIds);
    if (next.has(labelId)) next.delete(labelId);
    else next.add(labelId);
    onChange({ ...filters, labelIds: next });
  }

  function toggleAssignee(userId: string) {
    const next = new Set(filters.assigneeIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    onChange({ ...filters, assigneeIds: next });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Filter${count > 0 ? ` (${count} active)` : ''}`}
            className={cn(count > 0 && 'border-accent-soft-border bg-accent-soft text-accent-700 hover:bg-accent-soft')}
          >
            <SlidersHorizontalIcon className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[300px] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <SlidersHorizontalIcon className="size-4" /> Filters
          </span>
          {count > 0 && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-700">
              {count} on
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="px-0.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Labels</span>
          {labels?.length === 0 && (
            <p className="px-0.5 text-xs text-muted-foreground">No labels on this board yet.</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {labels?.map((label) => {
              const active = filters.labelIds.has(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className="inline-flex h-6 items-center rounded-xs px-2 text-xs font-semibold outline-none transition-shadow"
                  style={{
                    backgroundColor: LABEL_COLOR_HEX[label.color],
                    color: LABEL_COLOR_TEXT[label.color] === 'white' ? '#ffffff' : '#0b0b0b',
                    boxShadow: active ? '0 0 0 2px var(--accent-400)' : undefined,
                  }}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="flex flex-col gap-1">
          <span className="px-0.5 pb-0.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            Assignees
          </span>
          {members?.length === 0 && (
            <p className="px-0.5 text-xs text-muted-foreground">No members on this board yet.</p>
          )}
          {members?.map((member) => (
            <label
              key={member.userId}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent"
            >
              <Checkbox
                checked={filters.assigneeIds.has(member.userId)}
                onCheckedChange={() => toggleAssignee(member.userId)}
              />
              <PersonAvatar name={member.user.name} avatarUrl={member.user.avatarUrl} className="size-6" />
              <span className="min-w-0 flex-1 truncate text-sm">{member.user.name}</span>
            </label>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Stops arrow-key/typing input from reaching the Menu's own
            roving-focus handling, which would otherwise steal keystrokes
            meant for the date inputs (same reason LabelPicker's own text
            input is wrapped this way). */}
        <div className="flex flex-col gap-1.5" onKeyDown={(event) => event.stopPropagation()}>
          <span className="px-0.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            Due date range
          </span>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              aria-label="Due after"
              value={filters.dueFrom}
              onChange={(event) => onChange({ ...filters, dueFrom: event.target.value })}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              aria-label="Due before"
              value={filters.dueTo}
              onChange={(event) => onChange({ ...filters, dueTo: event.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={count === 0}
            onClick={() => onChange(EMPTY_CARD_FILTERS)}
          >
            Clear filters
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
