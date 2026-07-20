'use client';

import type { BoardMember, Card } from '@todoapp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, UserPlusIcon } from 'lucide-react';

import { assignCard, listBoardMembers, unassignCard } from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PersonAvatar } from '@/components/ui/person-avatar';

// Story 4.5 (FR26): toggle Board Members on/off a Card, one popover, same
// toggle-row pattern as LabelPicker minus the create/edit form — the Board
// Member list itself is managed elsewhere (Board settings, Story 2.5/2.6),
// this only attaches/detaches an existing member on this Card.
export function AssigneePicker({ card, boardId, listId }: { card: Card; boardId: string; listId: string }) {
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => listBoardMembers(boardId),
  });

  function invalidateCard() {
    queryClient.invalidateQueries({ queryKey: ['cards', listId] });
  }

  const assignMutation = useMutation({
    mutationFn: (userId: string) => assignCard(card.id, { userId }),
    onSuccess: invalidateCard,
  });
  const unassignMutation = useMutation({
    mutationFn: (userId: string) => unassignCard(card.id, userId),
    onSuccess: invalidateCard,
  });

  function toggleAssigned(member: BoardMember) {
    const assigned = card.assignees.some((a) => a.id === member.userId);
    if (assigned) unassignMutation.mutate(member.userId);
    else assignMutation.mutate(member.userId);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlusIcon /> Assignees
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-64">
        {members?.length === 0 && (
          <p className="px-1.5 py-1 text-xs text-muted-foreground">No members on this board yet.</p>
        )}
        {members?.map((member) => {
          const assigned = card.assignees.some((a) => a.id === member.userId);
          return (
            <button
              key={member.userId}
              type="button"
              onClick={() => toggleAssigned(member)}
              className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left outline-none hover:bg-accent"
            >
              <PersonAvatar name={member.user.name} avatarUrl={member.user.avatarUrl} className="size-6" />
              <span className="min-w-0 flex-1 truncate text-sm">{member.user.name}</span>
              {assigned && <CheckIcon className="size-4 shrink-0" />}
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
