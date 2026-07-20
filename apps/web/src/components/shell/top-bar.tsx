import type { AuthResponse } from '@todoapp/shared';
import { SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { NotificationCenter } from './notification-center';
import { UserMenu } from './user-menu';
import { WorkspaceSwitcher } from './workspace-switcher';

type User = AuthResponse['user'];

// Search (Epic 7) isn't built yet — still an inert stub per UX §3. The
// notification bell (Epic 6, Story 6.2) is real now.
export function TopBar({ user }: { user: User }) {
  return (
    <header className="flex h-12 items-center justify-between border-b px-3">
      <WorkspaceSwitcher />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" disabled title="Search — coming soon">
          <SearchIcon />
          <span className="sr-only">Search</span>
        </Button>
        <NotificationCenter />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
