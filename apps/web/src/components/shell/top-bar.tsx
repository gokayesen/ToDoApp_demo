import type { AuthResponse } from '@todoapp/shared';

import { GlobalSearch } from './global-search';
import { NotificationCenter } from './notification-center';
import { UserMenu } from './user-menu';
import { WorkspaceSwitcher } from './workspace-switcher';

type User = AuthResponse['user'];

export function TopBar({ user }: { user: User }) {
  return (
    <header className="flex h-12 items-center justify-between border-b px-3">
      <WorkspaceSwitcher />
      <div className="flex items-center gap-1">
        <GlobalSearch />
        <NotificationCenter />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
