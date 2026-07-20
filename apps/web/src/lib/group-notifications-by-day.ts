import type { Notification } from '@todoapp/shared';

const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// UX §4.4: "list of notifications grouped by day". Assumes `notifications` is
// already newest-first (GET /notifications' own ordering), so both the groups
// and each group's members come out newest-first with no re-sorting here.
export function groupNotificationsByDay(notifications: Notification[]): Array<[string, Notification[]]> {
  const today = startOfDay(new Date());
  const yesterday = today - 24 * 60 * 60 * 1000;
  const groups = new Map<string, Notification[]>();

  for (const notification of notifications) {
    const createdAt = new Date(notification.createdAt);
    const day = startOfDay(createdAt);
    const label = day === today ? 'Today' : day === yesterday ? 'Yesterday' : dayFormatter.format(createdAt);
    const existing = groups.get(label);
    if (existing) existing.push(notification);
    else groups.set(label, [notification]);
  }

  return Array.from(groups.entries());
}
