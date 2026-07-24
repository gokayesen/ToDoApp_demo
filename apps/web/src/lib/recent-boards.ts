// Client-side "recently viewed" tracking for the Dashboard (UX §4.1). No
// backend model for this exists (or is planned in Architecture §4), so it's
// kept entirely client-side rather than inventing a new table for it.
//
// Keyed per-userId (not a single shared key) — multiple accounts can log
// into the same browser one after another (e.g. a shared/demo machine), and
// a single shared key would leak the previous account's board names into the
// next account's Dashboard even though the backend correctly 403s any actual
// board content for boards that account can't access.
const STORAGE_KEY_PREFIX = 'todoapp:recent-boards:';
const MAX_RECENT = 6;

export interface RecentBoard {
  id: string;
  name: string;
  workspaceId: string;
}

export function getRecentBoards(userId: string): RecentBoard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    return raw ? (JSON.parse(raw) as RecentBoard[]) : [];
  } catch {
    return [];
  }
}

export function recordBoardVisit(userId: string, board: RecentBoard): void {
  if (typeof window === 'undefined') return;
  const existing = getRecentBoards(userId).filter((b) => b.id !== board.id);
  const updated = [board, ...existing].slice(0, MAX_RECENT);
  window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(updated));
}
