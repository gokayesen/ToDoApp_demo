import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { passport } from './lib/passport.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';

export function createApp() {
  const app = express();

  // Explicit non-wildcard origin: required for credentialed cross-origin requests
  // (Architecture §7.1) — wildcard + credentials:true is rejected by browsers anyway.
  app.use(cors({ credentials: true, origin: process.env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/users', usersRouter);

  app.use(errorHandler);

  return app;
}
