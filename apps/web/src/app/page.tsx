'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-context';
import { listWorkspaces } from '@/lib/workspace-api';
import { AppShell } from '@/components/shell/app-shell';
import { EmptyState } from '@/components/dashboard/empty-state';
import { RecentBoardsRow } from '@/components/dashboard/recent-boards-row';
import { WorkspaceSection } from '@/components/dashboard/workspace-section';

// Story 2.10: Dashboard content (grid of boards grouped by Workspace, UX
// §4.1), wrapped in the Story 2.11 App Shell (top bar + sidebar, UX §3).
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const { data: workspaces, isLoading: workspacesLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
    enabled: !!user,
  });

  // Redirected from an effect, not during render — calling router.replace()
  // synchronously in the render body triggers React's "setState while
  // rendering a different component" warning and the navigation isn't
  // reliably applied.
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <AppShell user={user}>
      <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
        {workspacesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : workspaces && workspaces.length > 0 ? (
          <>
            <RecentBoardsRow />
            {workspaces.map((workspace) => (
              <WorkspaceSection key={workspace.id} workspace={workspace} />
            ))}
          </>
        ) : (
          <EmptyState userName={user.name} />
        )}
      </div>
    </AppShell>
  );
}
