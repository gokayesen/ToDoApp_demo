import type { NotificationEventType } from '@todoapp/shared';

// Story 6.6 (FR35): display copy for the settings screen — kept in
// apps/web rather than packages/shared even though it's keyed by the same
// enum, since this is a `const` array (a value export) consumed by a 'use
// client' page. See [[project-nextjs-shared-barrel-bug]]: a client
// component importing a value export from packages/shared breaks unrelated
// sibling exports from the whole shared-package barrel — only the type
// itself is imported from there.
export const NOTIFICATION_EVENT_TYPES: Array<{
  type: NotificationEventType;
  label: string;
  description: string;
}> = [
  { type: 'card.assigned', label: 'Card assignments', description: "When you're assigned to a card" },
  {
    type: 'comment.mention',
    label: 'Mentions',
    description: 'When someone @mentions you in a comment',
  },
  {
    type: 'workspace.added',
    label: 'Added to a workspace',
    description: "When you're added to a workspace",
  },
  { type: 'board.added', label: 'Added to a board', description: "When you're added to a board" },
  {
    type: 'card.due_soon',
    label: 'Due soon reminders',
    description: 'When a card assigned to you is due soon',
  },
  {
    type: 'card.overdue',
    label: 'Overdue reminders',
    description: 'When a card assigned to you is overdue',
  },
];
