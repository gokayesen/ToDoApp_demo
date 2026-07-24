import type { AuthResponse } from '@todoapp/shared';
import { CheckIcon } from 'lucide-react';

import { GlobalSearch } from './global-search';
import { NotificationCenter } from './notification-center';
import { UserMenu } from './user-menu';
import { WorkspaceSwitcher } from './workspace-switcher';

type User = AuthResponse['user'];

export function TopBar({ user }: { user: User }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-6 border-b border-border bg-card px-6">
      <div className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-foreground">
        <span className="flex size-[26px] items-center justify-center rounded-[7px] bg-primary">
          <CheckIcon className="size-4 text-primary-foreground" strokeWidth={3} />
        </span>
        ToDoApp
      </div>
      <WorkspaceSwitcher />
      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NotificationCenter />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
