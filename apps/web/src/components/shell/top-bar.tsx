import type { AuthResponse } from '@todoapp/shared';
import { BellIcon, SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { UserMenu } from './user-menu';
import { WorkspaceSwitcher } from './workspace-switcher';

type User = AuthResponse['user'];

// Search (Epic 7) and notifications (Epic 6) aren't built yet — these are
// inert stubs marking their spot in the shell per UX §3, not broken links.
export function TopBar({ user }: { user: User }) {
  return (
    <header className="flex h-12 items-center justify-between border-b px-3">
      <WorkspaceSwitcher />
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" disabled title="Search — coming soon">
          <SearchIcon />
          <span className="sr-only">Search</span>
        </Button>
        <Button variant="ghost" size="icon-sm" disabled title="Notifications — coming soon">
          <BellIcon />
          <span className="sr-only">Notifications</span>
        </Button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
