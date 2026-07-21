import type { Card } from '@todoapp/shared';

// FR38: board-level filter state (Label / Assignee / Due Date range) — a
// plain client-side predicate over Cards already in the TanStack cache, no
// server round-trip, since every Card on the board is already loaded.
export type CardFilters = {
  labelIds: Set<string>;
  assigneeIds: Set<string>;
  // Native <input type="date"> values ('YYYY-MM-DD') or '' when unset.
  dueFrom: string;
  dueTo: string;
};

export const EMPTY_CARD_FILTERS: CardFilters = {
  labelIds: new Set(),
  assigneeIds: new Set(),
  dueFrom: '',
  dueTo: '',
};

export function activeFilterCount(filters: CardFilters): number {
  return filters.labelIds.size + filters.assigneeIds.size + (filters.dueFrom || filters.dueTo ? 1 : 0);
}

// Card.dueDate is an ISO string over the wire (card-item.tsx's own
// convention) — comparing the sliced date part directly as a string avoids a
// local-timezone round-trip shift, same reasoning as card-detail.tsx's
// toDateInputValue.
export function cardMatchesFilters(card: Card, filters: CardFilters): boolean {
  if (filters.labelIds.size > 0 && !card.labels.some((label) => filters.labelIds.has(label.id))) {
    return false;
  }
  if (
    filters.assigneeIds.size > 0 &&
    !card.assignees.some((assignee) => filters.assigneeIds.has(assignee.id))
  ) {
    return false;
  }
  if (filters.dueFrom || filters.dueTo) {
    if (!card.dueDate) return false;
    const due = String(card.dueDate).slice(0, 10);
    if (filters.dueFrom && due < filters.dueFrom) return false;
    if (filters.dueTo && due > filters.dueTo) return false;
  }
  return true;
}
