'use client';

import type { Notification } from '@todoapp/shared';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellIcon, SettingsIcon, XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notification-api';
import { groupNotificationsByDay } from '@/lib/group-notifications-by-day';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

// payload is freeform JSON (packages/shared's notificationSchema); this
// reads the two conventions this story established and Story 6.3/6.4's
// triggers now populate: `payload.message` as the human-readable line
// (falling back to a generic one) and `payload.boardId` as the click-through
// target. There's no mechanism yet to deep-link straight into a Card
// (board-lists.tsx has no open-by-id query param), so click-through only
// goes as far as the Board.
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
              <Badge
                variant="count"
                tone="danger"
                aria-hidden
                className="absolute -top-1 -right-1"
              >
                {unreadCount}
              </Badge>
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
          className="fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-full flex-col gap-3 overflow-y-auto border-l border-border bg-popover p-4 text-sm text-popover-foreground outline-none duration-[320ms] data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          style={{ boxShadow: 'var(--shadow-modal)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <DialogPrimitive.Title className="flex items-center gap-2 font-heading text-base font-semibold">
              <BellIcon className="size-[18px] text-muted-foreground" />
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
                  <p className="px-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{day}</p>
                  <div className="flex flex-col gap-0.5">
                    {dayNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleSelect(notification)}
                        className={cn(
                          'flex items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-muted',
                          !notification.isRead && 'bg-accent-soft hover:bg-accent-soft',
                        )}
                      >
                        <span className="flex-1">
                          <span className="block text-foreground">{describeNotification(notification)}</span>
                          <span className="text-xs text-muted-foreground">
                            {timeFormatter.format(new Date(notification.createdAt))}
                          </span>
                        </span>
                        {!notification.isRead && <Badge variant="dot" tone="accent" aria-hidden className="mt-1.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="mt-auto flex items-center gap-1.5 self-start text-muted-foreground"
            onClick={() => {
              setOpen(false);
              router.push('/settings/notifications');
            }}
          >
            <SettingsIcon className="size-3.5" />
            Notification settings
          </Button>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
