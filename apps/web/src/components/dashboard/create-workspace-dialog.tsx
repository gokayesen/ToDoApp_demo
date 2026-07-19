'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';

import { ApiError } from '@/lib/api-client';
import { createWorkspace } from '@/lib/workspace-api';
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

export function CreateWorkspaceDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createWorkspace({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
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
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>You&apos;ll become its Owner.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
