'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckIcon, FilterIcon } from 'lucide-react';

import { listBoardMembers, listLabels } from '@/lib/board-api';
import { activeFilterCount, EMPTY_CARD_FILTERS, type CardFilters } from '@/lib/card-filters';
import { LABEL_COLOR_HEX } from '@/lib/label-colors';
import { Button } from '@/components/ui/button';
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
          <Button variant="outline" size="sm">
            <FilterIcon /> Filter{count > 0 ? ` (${count})` : ''}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex flex-col gap-1 px-1.5 py-1">
          <span className="text-xs font-medium text-muted-foreground">Labels</span>
          {labels?.length === 0 && (
            <p className="text-xs text-muted-foreground">No labels on this board yet.</p>
          )}
          {labels?.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => toggleLabel(label.id)}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left outline-none hover:bg-accent"
            >
              <span
                className="h-5 w-8 shrink-0 rounded"
                style={{ backgroundColor: LABEL_COLOR_HEX[label.color] }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{label.name}</span>
              {filters.labelIds.has(label.id) && <CheckIcon className="size-4 shrink-0" />}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        <div className="flex flex-col gap-1 px-1.5 py-1">
          <span className="text-xs font-medium text-muted-foreground">Assignees</span>
          {members?.length === 0 && (
            <p className="text-xs text-muted-foreground">No members on this board yet.</p>
          )}
          {members?.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => toggleAssignee(member.userId)}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left outline-none hover:bg-accent"
            >
              <PersonAvatar name={member.user.name} avatarUrl={member.user.avatarUrl} className="size-6" />
              <span className="min-w-0 flex-1 truncate text-sm">{member.user.name}</span>
              {filters.assigneeIds.has(member.userId) && <CheckIcon className="size-4 shrink-0" />}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Stops arrow-key/typing input from reaching the Menu's own
            roving-focus handling, which would otherwise steal keystrokes
            meant for the date inputs (same reason LabelPicker's own text
            input is wrapped this way). */}
        <div className="flex flex-col gap-1 px-1.5 py-1" onKeyDown={(event) => event.stopPropagation()}>
          <span className="text-xs font-medium text-muted-foreground">Due date range</span>
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

        {count > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-1.5 py-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(EMPTY_CARD_FILTERS)}>
                Clear filters
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
