import type { ActivityLogEntry } from '@todoapp/shared';

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function formatDate(value: unknown): string {
  return typeof value === 'string' ? dateFormatter.format(new Date(value)) : 'none';
}

// Story 4.9 (FR30): one line of human-readable text per Activity Log entry,
// matching UX §4.3's example ("Ayşe moved this card from To Do to Doing") —
// the type/metadata shape is written in card.service.ts/checklist.service.ts/
// attachment.service.ts's logActivity() calls, read back here.
export function describeActivity(entry: ActivityLogEntry): string {
  const m = entry.metadata as Record<string, unknown>;
  switch (entry.type) {
    case 'card.moved':
      return `moved this card from ${String(m.fromListName)} to ${String(m.toListName)}`;
    case 'card.renamed':
      return `renamed this card from "${String(m.from)}" to "${String(m.to)}"`;
    case 'card.description_updated':
      return 'updated the description';
    case 'card.archived':
      return 'archived this card';
    case 'card.restored':
      return 'restored this card';
    case 'card.due_date_changed':
      return m.to ? `set the due date to ${formatDate(m.to)}` : 'cleared the due date';
    case 'card.start_date_changed':
      return m.to ? `set the start date to ${formatDate(m.to)}` : 'cleared the start date';
    case 'label.attached':
      return `added the label "${String(m.labelName)}"`;
    case 'label.detached':
      return `removed the label "${String(m.labelName)}"`;
    case 'assignee.added':
      return `assigned ${String(m.userName)}`;
    case 'assignee.removed':
      return `unassigned ${String(m.userName)}`;
    case 'checklist.created':
      return `added the checklist "${String(m.title)}"`;
    case 'checklist.deleted':
      return `removed the checklist "${String(m.title)}"`;
    case 'attachment.added':
      return `attached ${String(m.fileName)}`;
    case 'attachment.removed':
      return `removed the attachment ${String(m.fileName)}`;
    default:
      return 'updated this card';
  }
}
