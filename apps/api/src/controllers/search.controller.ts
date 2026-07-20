import { searchQuerySchema } from '@todoapp/shared';
import type { Request, Response } from 'express';

import { asyncHandler } from '../lib/async-handler.js';
import * as searchService from '../services/search.service.js';

// Query-string validation happens here rather than via a shared
// validateQuery middleware — GET /search is the only route in the app that
// takes one, so a reusable middleware would be speculative right now (see
// validateBody, middleware/validate.ts, for the body-side equivalent this
// mirrors if a second query-param route ever needs it).
export const searchCardsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = searchQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid query parameters', issues: result.error.issues });
    return;
  }
  const results = await searchService.searchCards(req.userId!, result.data.q);
  res.json(results);
});
