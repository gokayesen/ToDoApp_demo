'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { ApiError } from '@/lib/api-client';
import { createList } from '@/lib/board-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// UX §4.2 "+ Add list" affordance: same inline-entry pattern as the "Inline
// quick-add card" spec in UX §5 (click reveals a text input, Enter submits
// and stays open for the next one, Esc/blur-while-empty cancels) rather than
// a modal, since a List is just a name.
export function AddListForm({ boardId }: { boardId: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createList(boardId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
      setName('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  function cancel() {
    setEditing(false);
    setName('');
    setError(null);
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        className="w-72 shrink-0 justify-start text-muted-foreground hover:bg-card/60 hover:text-foreground"
        onClick={() => setEditing(true)}
      >
        <PlusIcon />
        Add list
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-[288px] shrink-0 flex-col gap-2 rounded-md border border-neutral-200/80 bg-neutral-100/70 p-2 backdrop-blur-sm"
    >
      <Input
        autoFocus
        required
        placeholder="List name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel();
        }}
        onBlur={() => {
          if (!name) cancel();
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Adding…' : 'Add list'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
