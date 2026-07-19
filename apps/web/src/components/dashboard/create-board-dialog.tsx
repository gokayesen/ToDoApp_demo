'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';

import { ApiError } from '@/lib/api-client';
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
// Lists/Cards don't exist yet (Epic 3), so a template can only pre-fill a
// name for now — seeding real starter Lists belongs in whichever Epic 3 story
// adds List CRUD, not here.
const TEMPLATES = ['Simple Kanban', 'Sprint Board', 'Blank Board'];

export function CreateBoardDialog({
  workspaceId,
  trigger,
}: {
  workspaceId: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createBoard(workspaceId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] });
      setOpen(false);
      setName('');
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
          <DialogDescription>Pick a starter name or write your own.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((template) => (
              <Button
                key={template}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setName(template)}
              >
                {template}
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
