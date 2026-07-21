'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useActiveWorkspace } from '@/lib/active-workspace-context';
import { cn } from '@/lib/utils';
import { listBoards, listWorkspaces } from '@/lib/workspace-api';
import { Button } from '@/components/ui/button';
import { CreateBoardDialog } from '@/components/dashboard/create-board-dialog';
import { CreateWorkspaceDialog } from '@/components/dashboard/create-workspace-dialog';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();
  const { data: workspaces } = useQuery({ queryKey: ['workspaces'], queryFn: listWorkspaces });
  const { data: boards } = useQuery({
    queryKey: ['boards', activeWorkspaceId],
    queryFn: () => listBoards(activeWorkspaceId!),
    enabled: !!activeWorkspaceId,
  });

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col gap-4 border-r p-3 transition-[width]',
        collapsed ? 'w-12' : 'w-56',
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </Button>

      {!collapsed && (
        <>
          <div className="flex flex-col gap-1">
            <p className="px-1.5 text-xs font-medium text-muted-foreground">Workspaces</p>
            {workspaces?.map((workspace) => (
              <Button
                key={workspace.id}
                variant="ghost"
                size="sm"
                className={cn(
                  'justify-start',
                  workspace.id === activeWorkspaceId && 'bg-muted text-foreground',
                )}
                onClick={() => setActiveWorkspaceId(workspace.id)}
              >
                <span className="truncate">{workspace.name}</span>
              </Button>
            ))}
            <CreateWorkspaceDialog
              trigger={
                <Button variant="ghost" size="sm" className="justify-start text-muted-foreground">
                  <PlusIcon />
                  New workspace
                </Button>
              }
            />
          </div>

          {activeWorkspaceId && (
            <div className="flex flex-col gap-1">
              <p className="px-1.5 text-xs font-medium text-muted-foreground">Boards</p>
              {boards?.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className={cn(
                    'truncate rounded-md px-1.5 py-1 text-sm hover:bg-muted',
                    pathname === `/boards/${board.id}` && 'bg-muted text-foreground',
                  )}
                >
                  {board.name}
                </Link>
              ))}
              <CreateBoardDialog
                workspaceId={activeWorkspaceId}
                trigger={
                  <Button variant="ghost" size="sm" className="justify-start text-muted-foreground">
                    <PlusIcon />
                    New board
                  </Button>
                }
              />
            </div>
          )}
        </>
      )}
    </aside>
  );
}
