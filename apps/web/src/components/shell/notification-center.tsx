'use client';

import type { Notification } from '@todoapp/shared';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellIcon, XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notification-api';
import { groupNotificationsByDay } from '@/lib/group-notifications-by-day';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

// No producer writes a Notification row yet (Story 6.3's job) — payload is
// freeform JSON (packages/shared's notificationSchema), so this reads two
// conventions this story establishes for whatever Story 6.3 will populate:
// `payload.message` as the human-readable line (falling back to a generic
// one) and `payload.boardId` as the click-through target. There's no
// mechanism yet to deep-link straight into a Card (board-lists.tsx has no
// open-by-id query param), so click-through only goes as far as the Board.
function describeNotification(notification: Notification): string {
  const message = (notification.payload as Record<string, unknown>).message;
  return typeof message === 'string' && message.length > 0 ? message : 'New notification';
}

function notificationBoardId(notification: Notification): string | null {
  const boardId = (notification.payload as Record<string, unknown>).boardId;
  return typeof boardId === 'string' ? boardId : null;
}

export function NotificationCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // staleTime: Infinity — there's no live-push producer for notifications yet
  // (no socket event, Story 6.3 is triggers), so nothing outside this
  // component's own mutations ever changes server-side state; letting
  // TanStack Query's default refetch-on-mount run would otherwise race the
  // optimistic updates below on every navigation (the bell/panel remounts
  // per page, since it lives in each page's own AppShell instance) and could
  // clobber a just-applied read-state with a stale pre-mutation response.
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    staleTime: Infinity,
  });

  function setNotifications(updater: (old: Notification[] | undefined) => Notification[] | undefined) {
    queryClient.setQueryData<Notification[]>(['notifications'], updater);
  }

  // Optimistic (onMutate), not invalidate-and-refetch: handleSelect below
  // navigates away immediately on a boardId click, which would otherwise
  // unmount this panel before a post-success refetch ever resolves, leaving
  // the bell's unread dot stale on the destination page. onSuccess still
  // reconciles with the server's authoritative response, in case the write
  // itself changed something the optimistic guess didn't anticipate.
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      setNotifications((old) => old?.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
      return { previous };
    },
    onSuccess: (updated) => {
      setNotifications((old) => old?.map((n) => (n.id === updated.id ? updated : n)));
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) setNotifications(() => context.previous);
    },
  });
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previous = queryClient.getQueryData<Notification[]>(['notifications']);
      setNotifications((old) => old?.map((n) => ({ ...n, isRead: true })));
      return { previous };
    },
    onSuccess: (updated) => {
      setNotifications(() => updated);
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) setNotifications(() => context.previous);
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  function handleSelect(notification: Notification) {
    if (!notification.isRead) markReadMutation.mutate(notification.id);
    const boardId = notificationBoardId(notification);
    if (boardId) {
      setOpen(false);
      router.push(`/boards/${boardId}`);
    }
  }

  const groups = groupNotificationsByDay(notifications ?? []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative" title="Notifications">
            <BellIcon />
            <span className="sr-only">Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}</span>
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="absolute top-0.5 right-0.5 size-2 rounded-full bg-destructive"
              />
            )}
          </Button>
        }
      />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="dialog-overlay"
          className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          data-slot="notification-center-content"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col gap-3 overflow-y-auto border-l bg-popover p-4 text-sm text-popover-foreground outline-none duration-150 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
        >
          <div className="flex items-center justify-between gap-2">
            <DialogPrimitive.Title className="font-heading text-base font-medium">
              Notifications
            </DialogPrimitive.Title>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={unreadCount === 0}
                onClick={() => markAllReadMutation.mutate()}
              >
                Mark all as read
              </Button>
              <DialogPrimitive.Close
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {groups.length === 0 ? (
            <p className="mt-8 text-center text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map(([day, dayNotifications]) => (
                <div key={day} className="flex flex-col gap-1">
                  <p className="px-1 text-xs font-medium text-muted-foreground">{day}</p>
                  <div className="flex flex-col gap-0.5">
                    {dayNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleSelect(notification)}
                        className={cn(
                          'flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted',
                          !notification.isRead && 'bg-primary/5',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'mt-1.5 size-1.5 shrink-0 rounded-full',
                            notification.isRead ? 'bg-transparent' : 'bg-primary',
                          )}
                        />
                        <span className="flex-1">
                          <span className="block text-foreground">{describeNotification(notification)}</span>
                          <span className="text-xs text-muted-foreground">
                            {timeFormatter.format(new Date(notification.createdAt))}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Story 6.6 builds the per-event email preference settings screen
              this links to — same inert-stub convention top-bar.tsx already
              uses for features whose home doesn't exist yet. */}
          <Button variant="ghost" size="sm" disabled className="mt-auto self-start" title="Coming soon">
            Notification settings
          </Button>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
