import type { SearchResult } from '@todoapp/shared';

// Story 7.2 (UX top-bar search): groups already-ranked (newest-updatedAt-first,
// GET /search's own ordering) results by Board, preserving that ordering both
// across groups (by each group's first/most-recent result) and within one.
export function groupSearchResultsByBoard(
  results: SearchResult[],
): Array<{ boardId: string; boardName: string; workspaceName: string; cards: SearchResult[] }> {
  const groups = new Map<string, { boardId: string; boardName: string; workspaceName: string; cards: SearchResult[] }>();

  for (const result of results) {
    const existing = groups.get(result.boardId);
    if (existing) existing.cards.push(result);
    else
      groups.set(result.boardId, {
        boardId: result.boardId,
        boardName: result.boardName,
        workspaceName: result.workspaceName,
        cards: [result],
      });
  }

  return Array.from(groups.values());
}
