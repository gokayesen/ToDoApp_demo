import { Router } from 'express';

import { searchCardsHandler } from '../controllers/search.controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const searchRouter = Router();

searchRouter.use(authenticate);

// FR37: purely user-scoped (accessibility is resolved per-Board inside the
// query itself, search.repository.ts), no board/role context middleware
// needed — same shape as notifications.ts.
searchRouter.get('/', searchCardsHandler);
