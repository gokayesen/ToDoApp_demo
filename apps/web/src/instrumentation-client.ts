import * as Sentry from '@sentry/nextjs';

// NFR10 — see sentry.server.config.ts. Client-side init; auto-loaded by
// Next.js (App Router) before the app's own client code runs.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
