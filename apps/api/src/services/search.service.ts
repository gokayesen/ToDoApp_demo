import { searchCardsForUser } from '../repositories/search.repository.js';

// FR37: flattens each matching Card + its List/Board/Workspace names into one
// row (searchResultSchema, packages/shared) — the UI groups results by Board
// (Story 7.2) directly off this shape, no second lookup needed.
export async function searchCards(userId: string, query: string) {
  const rows = await searchCardsForUser(userId, query);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    listId: row.list.id,
    listName: row.list.name,
    boardId: row.list.board.id,
    boardName: row.list.board.name,
    workspaceId: row.list.board.workspaceId,
    workspaceName: row.list.board.workspace.name,
  }));
}
