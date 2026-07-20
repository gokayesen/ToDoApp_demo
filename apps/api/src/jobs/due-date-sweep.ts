import {
  findCardsForDueDateSweep,
  markCardDueSoonNotified,
  markCardOverdueNotified,
} from '../repositories/card.repository.js';
import { notifyUser } from '../services/notification.service.js';

// Must match apps/web/src/lib/due-date-status.ts's own DUE_SOON_WINDOW_MS —
// duplicated rather than shared via packages/shared to avoid the known
// Next.js/Turbopack barrel bug (see [[project-nextjs-shared-barrel-bug]]:
// a 'use client' component importing a value export from packages/shared
// breaks unrelated sibling exports from the whole shared-package barrel).
const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// FR34/NFR5: approaching/overdue sweep. Architecture §9 requires this run
// exactly once regardless of how many `api` instances are live — this
// function is pure job *logic*, with no scheduling or Redis-lock concerns of
// its own (see run-due-date-sweep.ts and index.ts's in-process fallback,
// both of which wrap this in a leader lock per Architecture §9/§5's "jobs/
// holds job logic only" convention).
//
// Overdue takes priority over due-soon per card: once a due date has passed,
// there's no point retroactively sending a "due soon" notice for a window
// that's already closed, and overdueNotifiedAt alone is enough to prevent
// ever re-checking that branch again for this dueDate value.
export async function runDueDateSweep(): Promise<{ overdueNotified: number; dueSoonNotified: number }> {
  const now = Date.now();
  const cards = await findCardsForDueDateSweep();
  let overdueNotified = 0;
  let dueSoonNotified = 0;

  for (const card of cards) {
    if (!card.dueDate) continue;
    const due = card.dueDate.getTime();
    const boardId = card.list.boardId;

    if (card.overdueNotifiedAt === null && due < now) {
      for (const assignee of card.assignees) {
        await notifyUser(assignee.userId, 'card.overdue', {
          message: `"${card.title}" is overdue (was due ${dateFormatter.format(card.dueDate)})`,
          boardId,
        });
      }
      await markCardOverdueNotified(card.id);
      overdueNotified += 1;
    } else if (card.dueSoonNotifiedAt === null && due >= now && due - now <= DUE_SOON_WINDOW_MS) {
      for (const assignee of card.assignees) {
        await notifyUser(assignee.userId, 'card.due_soon', {
          message: `"${card.title}" is due soon (${dateFormatter.format(card.dueDate)})`,
          boardId,
        });
      }
      await markCardDueSoonNotified(card.id);
      dueSoonNotified += 1;
    }
  }

  return { overdueNotified, dueSoonNotified };
}
