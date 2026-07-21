import type { NextFunction, Request, Response } from 'express';

import { logger } from '../lib/logger.js';
import { HttpError } from '../lib/http-error.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  logger.error({ err }, 'unhandled request error');
  res.status(500).json({ error: 'Internal server error' });
}
