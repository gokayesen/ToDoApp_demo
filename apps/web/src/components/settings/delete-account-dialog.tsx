'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { setAccessToken, ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { deleteAccount, listOwnedWorkspaces } from '@/lib/user-api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Story 8.8 (FR40, Architecture §4/§10): irreversible, so it gets the same
// "type the exact value to confirm" pattern archive-list-dialog.tsx /
// board.service.ts's deleteBoard already established for a destructive step,
// here against the account's own email rather than a name. Fetches owned
// Workspaces fresh every time the dialog opens (not cached alongside it) —
// this is the one place in the app that needs to know, per owned Workspace,
// whether Architecture §4's Workspace.ownerId Restrict rule requires an
// explicit ownership-transfer pick before the delete can proceed.
export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [transfers, setTransfers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: ownedWorkspaces, isLoading } = useQuery({
    queryKey: ['users', 'me', 'owned-workspaces'],
    queryFn: listOwnedWorkspaces,
    enabled: open,
  });

  const workspacesNeedingTransfer = useMemo(
    () => (ownedWorkspaces ?? []).filter((ws) => ws.otherMembers.length > 0),
    [ownedWorkspaces],
  );
  const workspacesToBeDeleted = useMemo(
    () => (ownedWorkspaces ?? []).filter((ws) => ws.otherMembers.length === 0),
    [ownedWorkspaces],
  );

  const allTransfersChosen = workspacesNeedingTransfer.every((ws) => transfers[ws.id]);
  const emailMatches = confirmEmail === user?.email;
  const canSubmit = !isLoading && emailMatches && allTransfersChosen;

  const mutation = useMutation({
    mutationFn: () =>
      deleteAccount({
        confirmEmail,
        transfers: Object.entries(transfers).map(([workspaceId, newOwnerId]) => ({
          workspaceId,
          newOwnerId,
        })),
      }),
    onSuccess: () => {
      setAccessToken(null);
      setUser(null);
      router.push('/login');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Something went wrong'),
  });

  function reset(next: boolean) {
    if (!next) {
      setConfirmEmail('');
      setTransfers({});
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently deletes your account and cannot be undone. Comments, attachments, and
            activity you left on shared boards stay visible to your teammates.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Checking your workspaces…</p>}

        {workspacesToBeDeleted.length > 0 && (
          <p className="text-sm text-muted-foreground">
            You&apos;re the only member of{' '}
            {workspacesToBeDeleted.map((ws) => `"${ws.name}"`).join(', ')} — it will be permanently
            deleted along with your account.
          </p>
        )}

        {workspacesNeedingTransfer.map((ws) => (
          <div key={ws.id} className="flex flex-col gap-1.5">
            <Label htmlFor={`transfer-${ws.id}`}>
              Transfer ownership of &quot;{ws.name}&quot; to:
            </Label>
            <select
              id={`transfer-${ws.id}`}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={transfers[ws.id] ?? ''}
              onChange={(e) => setTransfers((prev) => ({ ...prev, [ws.id]: e.target.value }))}
            >
              <option value="" disabled>
                Choose a new owner…
              </option>
              {ws.otherMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-email">
            Type <span className="font-medium text-foreground">{user?.email}</span> to confirm
          </Label>
          <Input
            id="confirm-email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            autoComplete="off"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => reset(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Deleting…' : 'Permanently delete account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
