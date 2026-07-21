'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/shell/app-shell';
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog';
import { Button } from '@/components/ui/button';

// Story 8.8 (FR40): same AppShell/auth-guard shell as settings/notifications
// (Story 6.6) — the only content here is the "Danger Zone" account-deletion
// entry point; profile editing (name/avatar, Story 1.8's PATCH /users/me) has
// no UI anywhere yet and isn't this story's scope.
export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <AppShell user={user}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">Account settings</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.name} ({user.email}).
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 p-4">
          <h2 className="text-sm font-medium text-foreground">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all data only you have access to. This cannot be
            undone.
          </p>
          <div>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete account
            </Button>
          </div>
        </div>
      </div>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </AppShell>
  );
}
