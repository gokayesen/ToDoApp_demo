'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '@/lib/api-client';
import { createBoard, createWorkspace } from '@/lib/workspace-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// UX §4.1: "prominent 'Create your first board' CTA with 2–3 starter
// templates". A Board can't exist outside a Workspace (FR8), so a first-time
// user has neither yet — picking a template creates both in one step rather
// than making them go create a workspace first to unlock board creation.
const TEMPLATES = [
  { label: 'Simple Kanban', boardName: 'Simple Kanban' },
  { label: 'Sprint Board', boardName: 'Sprint Board' },
  { label: 'Blank Board', boardName: 'Blank Board' },
];

export function EmptyState({ userName }: { userName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (boardName: string) => {
      const workspace = await createWorkspace({ name: `${userName}'s Workspace` });
      await createBoard(workspace.id, { name: boardName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setPendingTemplate(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setPendingTemplate(null);
    },
  });

  function handlePick(boardName: string) {
    setError(null);
    setPendingTemplate(boardName);
    mutation.mutate(boardName);
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="items-center text-center">
        <CardTitle>Create your first board</CardTitle>
        <CardDescription>Pick a starting point — you can rename it anytime.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {TEMPLATES.map((template) => (
          <Button
            key={template.label}
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => handlePick(template.boardName)}
          >
            {pendingTemplate === template.boardName ? 'Creating…' : template.label}
          </Button>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
