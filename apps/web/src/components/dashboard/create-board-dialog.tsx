'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';

import { ApiError } from '@/lib/api-client';
import { createList } from '@/lib/board-api';
import { createBoard } from '@/lib/workspace-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// UX §4.1 asks for 2–3 starter templates on the "create your first board" CTA.
// Each template names its own starter Lists, seeded via sequential
// POST /boards/:boardId/lists calls right after board creation — the list
// service always appends at the end (Architecture §4 position engine), so a
// plain awaited loop naturally produces the right left-to-right order with
// no position param needed.
const TEMPLATES: { name: string; lists: string[] }[] = [
  { name: 'Simple Kanban', lists: ['To Do', 'Doing', 'Done'] },
  { name: 'Sprint Board', lists: ['Backlog', 'In Progress', 'Review', 'Done'] },
  { name: 'Blank Board', lists: [] },
];

export function CreateBoardDialog({
  workspaceId,
  trigger,
}: {
  workspaceId: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [starterLists, setStarterLists] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const board = await createBoard(workspaceId, { name });
      for (const listName of starterLists) {
        await createList(board.id, { name: listName });
      }
      return board;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] });
      setOpen(false);
      setName('');
      setStarterLists([]);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create board</DialogTitle>
          <DialogDescription>Pick a starter template or write your own name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((template) => (
              <Button
                key={template.name}
                type="button"
                variant="outline"
                size="sm"
                title={template.lists.length > 0 ? `Adds lists: ${template.lists.join(', ')}` : 'No starter lists'}
                onClick={() => {
                  setName(template.name);
                  setStarterLists(template.lists);
                }}
              >
                {template.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="board-name">Board name</Label>
            <Input
              id="board-name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
