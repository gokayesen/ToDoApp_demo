import type { AuthResponse } from '@todoapp/shared';
import type { ReactNode } from 'react';

import { ActiveWorkspaceProvider } from '@/lib/active-workspace-context';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

type User = AuthResponse['user'];

// UX §3 App Shell: persistent top bar + collapsible sidebar wrapping every
// authenticated route. Story 2.11.
export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  return (
    <ActiveWorkspaceProvider>
      <div className="flex min-h-screen flex-col">
        <TopBar user={user} />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ActiveWorkspaceProvider>
  );
}
