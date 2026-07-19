'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDownIcon } from 'lucide-react';
import { useEffect } from 'react';

import { useActiveWorkspace } from '@/lib/active-workspace-context';
import { listWorkspaces } from '@/lib/workspace-api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WorkspaceSwitcher() {
  const { data: workspaces } = useQuery({ queryKey: ['workspaces'], queryFn: listWorkspaces });
  const { activeWorkspaceId, setActiveWorkspaceId } = useActiveWorkspace();

  // Default to the first workspace once the list loads, if nothing's active yet.
  useEffect(() => {
    if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
      setActiveWorkspaceId(workspaces[0]!.id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const active = workspaces?.find((w) => w.id === activeWorkspaceId);

  if (!workspaces || workspaces.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="max-w-48">
            <span className="truncate">{active?.name ?? 'Select workspace'}</span>
            <ChevronsUpDownIcon className="text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start">
        {workspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} onClick={() => setActiveWorkspaceId(workspace.id)}>
            {workspace.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
