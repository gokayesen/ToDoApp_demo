import { z } from 'zod';

// FR37: query-string validation for GET /search. Trimmed and bounded so an
// empty/whitespace-only q can't fall through to matching every accessible
// Card, and an unreasonably long query can't be used to hammer the ILIKE scan.
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// One flattened row per matching Card, already carrying the List/Board/
// Workspace names the UI needs to group results by Board (Story 7.2) without
// a second round-trip.
export const searchResultSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  listId: z.string().uuid(),
  listName: z.string(),
  boardId: z.string().uuid(),
  boardName: z.string(),
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
