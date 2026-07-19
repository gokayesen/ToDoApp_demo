'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '@/lib/api-client';
import { archiveList } from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// FR16: archiving a List cascades to every active Card on it (Story 3.7
// backend), so — unlike the optimistic-with-undo pattern used elsewhere on
// the board (UX §5/§6) — this gets an explicit confirmation step first, since
// silently sweeping away every Card on the list is a bigger surprise than a
// single-item action.
export function ArchiveListDialog({
  open,
  onOpenChange,
  boardId,
  listId,
  listName,
  cardCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  listId: string;
  listName: string;
  cardCount: number;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => archiveList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
      onOpenChange(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive &quot;{listName}&quot;?</DialogTitle>
          <DialogDescription>
            {cardCount > 0
              ? `This will also archive ${cardCount} card${cardCount === 1 ? '' : 's'} on this list. `
              : ''}
            You can restore it later.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Archiving…' : 'Archive list'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
