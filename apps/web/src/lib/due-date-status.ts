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
