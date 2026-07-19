'use client';

import type { AuthResponse } from '@todoapp/shared';
import { useRouter } from 'next/navigation';

import { logout } from '@/lib/auth-api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type User = AuthResponse['user'];

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const { setUser } = useAuth();

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm">
            {user.name}
          </Button>
        }
      />
      {/* min-w overrides the default w-(--anchor-width), which ties the popup
          width to the trigger button — too narrow for an email address. */}
      <DropdownMenuContent align="end" className="min-w-56">
        {/* Plain text, not DropdownMenuLabel — this base-ui version requires
            GroupLabel to sit inside a Menu.Group, which doesn't apply here. */}
        <p className="truncate px-1.5 py-1 text-xs font-medium text-muted-foreground">
          {user.email}
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
