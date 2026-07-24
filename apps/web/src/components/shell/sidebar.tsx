'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon, LayoutDashboardIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useActiveWorkspace } from '@/lib/active-workspace-context';
import { cn } from '@/lib/utils';
import { listBoards, listWorkspaces } from '@/lib/workspace-api';
import { Button } from '@/components/ui/button';
import { CreateBoardDialog } from '@/components/dashboard/create-board-dialog';
import { CreateWorkspaceDialog } from '@/components/dashboard/create-workspace-dialog';

// Deterministic per-workspace swatch color (no stored "color" field on
// Workspace) — same "hash the name into a fixed palette" approach
// person-avatar.tsx already uses for initials-avatar backgrounds, reused
// here so each Workspace keeps a stable color across sessions.
const SWATCH_COLORS = [
  'var(--label-blue)',
  'var(--label-orange)',
  'var(--label-teal)',
  'var(--label-purple)',
  'var(--label-pink)',
  'var(--label-green)',
  'var(--label-indigo)',
  'var(--label-amber)',
];
function swatchFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return SWATCH_COLORS[hash % SWATCH_COLORS.length]!;
}

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
        'flex shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card p-3 transition-[width]',
        collapsed ? 'w-[60px]' : 'w-[260px]',
      )}
    >
      <div className="flex items-center justify-between">
        {!collapsed && <Link href="/" className="rounded-sm px-1.5 py-1 text-sm font-medium text-foreground hover:bg-muted">
          <span className="flex items-center gap-2">
            <LayoutDashboardIcon className="size-4" /> Dashboard
          </span>
        </Link>}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </Button>
      </div>

      {!collapsed && (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1.5">
              <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Workspaces</p>
              <CreateWorkspaceDialog
                trigger={
                  <button
                    type="button"
                    className="rounded-sm p-0.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
                    aria-label="New workspace"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                }
              />
            </div>
            {workspaces?.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={cn(
                  'flex items-center gap-2.5 rounded-sm px-1.5 py-1.5 text-left text-sm font-medium outline-none',
                  workspace.id === activeWorkspaceId
                    ? 'bg-accent-soft text-accent-700'
                    : 'text-muted-foreground hover:bg-muted',
                )}
                onClick={() => setActiveWorkspaceId(workspace.id)}
              >
                <span
                  className="size-[18px] shrink-0 rounded-[5px]"
                  style={{ background: swatchFor(workspace.id) }}
                />
                <span className="truncate">{workspace.name}</span>
              </button>
            ))}
          </div>

          {activeWorkspaceId && (
            <div className="flex flex-col gap-1.5">
              <p className="px-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Boards</p>
              {boards?.map((board) => (
                <Link
                  key={board.id}
                  href={`/boards/${board.id}`}
                  className={cn(
                    'truncate rounded-sm px-1.5 py-1.5 text-sm font-medium',
                    pathname === `/boards/${board.id}`
                      ? 'bg-accent-soft text-accent-700'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {board.name}
                </Link>
              ))}
            </div>
          )}

          {activeWorkspaceId && (
            <div className="mt-auto">
              <CreateBoardDialog
                workspaceId={activeWorkspaceId}
                trigger={
                  <Button variant="secondary" className="w-full justify-center">
                    <PlusIcon className="size-4" />
                    Create board
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
