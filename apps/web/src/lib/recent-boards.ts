// Client-side "recently viewed" tracking for the Dashboard (UX §4.1). Nothing
// calls recordBoardVisit yet — that's the Board View page, Epic 3 — so this
// row renders empty until then. No backend model for this exists (or is
// planned in Architecture §4), so it's kept entirely client-side rather than
// inventing a new table for it.
const STORAGE_KEY = 'todoapp:recent-boards';
const MAX_RECENT = 6;

export interface RecentBoard {
  id: string;
  name: string;
  workspaceId: string;
}

export function getRecentBoards(): RecentBoard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentBoard[]) : [];
  } catch {
    return [];
  }
}

export function recordBoardVisit(board: RecentBoard): void {
  if (typeof window === 'undefined') return;
  const existing = getRecentBoards().filter((b) => b.id !== board.id);
  const updated = [board, ...existing].slice(0, MAX_RECENT);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
