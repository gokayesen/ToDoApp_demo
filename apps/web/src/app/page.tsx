'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PlusIcon } from 'lucide-react';

import { logout } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth-context';
import { listWorkspaces } from '@/lib/workspace-api';
import { Button } from '@/components/ui/button';
import { CreateWorkspaceDialog } from '@/components/dashboard/create-workspace-dialog';
import { EmptyState } from '@/components/dashboard/empty-state';
import { RecentBoardsRow } from '@/components/dashboard/recent-boards-row';
import { WorkspaceSection } from '@/components/dashboard/workspace-section';

// Story 2.10: Dashboard (grid of boards grouped by Workspace, per UX §4.1).
// The full App Shell (top bar, sidebar) is Story 2.11 — this is just the
// dashboard content for the default landing route.
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();

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

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="text-lg font-medium">{user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateWorkspaceDialog
            trigger={
              <Button variant="outline" size="sm">
                <PlusIcon />
                New workspace
              </Button>
            }
          />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>

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
  );
}
