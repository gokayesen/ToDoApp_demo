import { AlertCircleIcon, CalendarIcon, ClockIcon, type LucideIcon } from 'lucide-react';

// FR25 / UX §2: semantic red/amber/green due-date status, shared by the card
// face pill (card-item.tsx) and the Card Detail dates field (card-detail.tsx)
// so the "due soon" window (24h) is defined in exactly one place.
export type DueStatus = 'overdue' | 'due-soon' | 'on-track';

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getDueStatus(dueDate: string | Date | null | undefined): DueStatus | null {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  if (due < now) return 'overdue';
  if (due - now <= DUE_SOON_WINDOW_MS) return 'due-soon';
  return 'on-track';
}

// Single presentation source for both the card-face DueDatePill
// (card-item.tsx) and Card Detail's status text, per the Sprint 14 design
// handoff spec: icon + colored bg/border/fg per status (not just tinted
// text). UX §8 "color is never the only signal" — each status still pairs
// its own icon shape with its own color, never a shared icon just recolored.
export const DUE_STATUS_PRESENTATION: Record<
  DueStatus,
  { icon: LucideIcon; label: string; fg: string; bg: string; border: string }
> = {
  overdue: { icon: AlertCircleIcon, label: 'Overdue', fg: 'text-danger-fg', bg: 'bg-danger-bg', border: 'border-danger-border' },
  'due-soon': { icon: ClockIcon, label: 'Due soon', fg: 'text-warning-fg', bg: 'bg-warning-bg', border: 'border-warning-border' },
  'on-track': { icon: CalendarIcon, label: 'On track', fg: 'text-success-fg', bg: 'bg-success-bg', border: 'border-success-border' },
};
