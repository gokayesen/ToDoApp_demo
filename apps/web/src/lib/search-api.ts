import type { SearchResult } from '@todoapp/shared';

import { apiFetch } from './api-client';

// FR37: q is sent through URLSearchParams (not template-interpolated) so a
// query containing `&`/`#`/etc. can't corrupt the query string.
export function searchCards(query: string) {
  const params = new URLSearchParams({ q: query });
  return apiFetch<SearchResult[]>(`/search?${params.toString()}`);
}
