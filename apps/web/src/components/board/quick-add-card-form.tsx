'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type KeyboardEvent } from 'react';

import { ApiError } from '@/lib/api-client';
import { createCard } from '@/lib/board-api';
import { Button } from '@/components/ui/button';

// UX §5 "Inline quick-add": a textarea-in-place at the bottom of a List
// (not a modal). Enter submits and immediately reopens a blank entry for
// rapid multi-card creation; Esc or blur-while-empty cancels.
export function QuickAddCardForm({ listId }: { listId: string }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (value: string) => createCard(listId, { title: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', listId] });
    },
    onError: (err, value) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      // Restore what the user typed — a failed submit shouldn't lose it, even
      // though the field was optimistically cleared to let the next entry
      // start immediately (rapid multi-card creation).
      setTitle(value);
    },
  });

  function submit() {
    const value = title.trim();
    if (!value) return;
    setError(null);
    // Clear synchronously rather than waiting for the mutation to resolve —
    // otherwise a fast second Enter/keystroke lands in the still-populated
    // textarea and gets appended onto the first card's title.
    setTitle('');
    mutation.mutate(value);
  }

  function cancel() {
    setEditing(false);
    setTitle('');
    setError(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        className="justify-start text-muted-foreground hover:bg-card/60 hover:text-foreground"
        onClick={() => setEditing(true)}
      >
        + Add card
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        autoFocus
        rows={2}
        placeholder="Enter a title for this card"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title) cancel();
        }}
        className="w-full resize-none rounded-sm border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Adding…' : 'Add card'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
