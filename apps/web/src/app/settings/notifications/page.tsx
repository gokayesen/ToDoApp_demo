'use client';

import type { NotificationPreference } from '@todoapp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-context';
import { listNotificationPreferences, updateNotificationPreference } from '@/lib/notification-api';
import { NOTIFICATION_EVENT_TYPES } from '@/lib/notification-event-types';
import { AppShell } from '@/components/shell/app-shell';
import { Switch } from '@/components/ui/switch';

const PREFERENCES_QUERY_KEY = ['notifications', 'preferences'];

// Story 6.6 (FR35): the settings screen Story 6.2's Notification Center
// links to. One row per known event type (packages/shared's
// notificationEventTypeSchema, formalized in this story) — a missing
// NotificationPreference row means "email enabled" (Story 6.1's contract),
// so a toggle defaults on until the user explicitly turns it off. Only
// emailEnabled is exposed here, matching FR35's literal "per-event email
// preferences" and this story's own title — inAppEnabled has no UI anywhere
// yet and isn't this story's scope.
export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: listNotificationPreferences,
    enabled: !!user,
  });

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const updateMutation = useMutation({
    mutationFn: updateNotificationPreference,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationPreference[]>(PREFERENCES_QUERY_KEY);
      queryClient.setQueryData<NotificationPreference[]>(PREFERENCES_QUERY_KEY, (old) => {
        const existing = old?.find((p) => p.eventType === input.eventType);
        if (existing) {
          return old!.map((p) => (p.eventType === input.eventType ? { ...p, ...input } : p));
        }
        return [
          ...(old ?? []),
          {
            id: `optimistic-${input.eventType}`,
            userId: user!.id,
            eventType: input.eventType,
            emailEnabled: input.emailEnabled ?? true,
            inAppEnabled: input.inAppEnabled ?? true,
          },
        ];
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(PREFERENCES_QUERY_KEY, context.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationPreference[]>(PREFERENCES_QUERY_KEY, (old) => {
        const existing = old?.some((p) => p.eventType === updated.eventType);
        if (existing) return old!.map((p) => (p.eventType === updated.eventType ? updated : p));
        return [...(old ?? []), updated];
      });
    },
  });

  if (loading || !user) return null;

  return (
    <AppShell user={user}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">Notification settings</h1>
          <p className="text-sm text-muted-foreground">
            Choose which events send you an email. In-app notifications aren&apos;t affected.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col divide-y rounded-lg border">
            {NOTIFICATION_EVENT_TYPES.map(({ type, label, description }) => {
              const existing = preferences?.find((p) => p.eventType === type);
              const emailEnabled = existing?.emailEnabled ?? true;
              return (
                <div key={type} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={emailEnabled}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({ eventType: type, emailEnabled: checked })
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
