'use client';

import type { Workspace } from '@todoapp/shared';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';

import { listBoards } from '@/lib/workspace-api';
import { Button } from '@/components/ui/button';
import { BoardCard } from './board-card';
import { CreateBoardDialog } from './create-board-dialog';

export function WorkspaceSection({ workspace }: { workspace: Workspace }) {
  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards', workspace.id],
    queryFn: () => listBoards(workspace.id),
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">{workspace.name}</h2>
        <CreateBoardDialog
          workspaceId={workspace.id}
          trigger={
            <Button variant="ghost" size="sm">
              <PlusIcon />
              New board
            </Button>
          }
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : boards && boards.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No boards yet in this workspace.</p>
      )}
    </section>
  );
}
