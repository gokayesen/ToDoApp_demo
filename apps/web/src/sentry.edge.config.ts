import * as Sentry from '@sentry/nextjs';

// NFR10 — see sentry.server.config.ts. Edge runtime (middleware) gets its own
// init file per Sentry's Next.js SDK convention.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
