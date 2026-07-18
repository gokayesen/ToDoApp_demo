import cors from 'cors';
import express from 'express';

import { healthRouter } from './routes/health.js';

export function createApp() {
  const app = express();

  app.use(cors({ credentials: true }));
  app.use(express.json());

  app.use('/health', healthRouter);

  return app;
}
