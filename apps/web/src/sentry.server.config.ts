import * as Sentry from '@sentry/nextjs';

// NFR10: same guarded-configuration pattern as the API's instrument.ts — no
// DSN configured (e.g. local dev) means Sentry stays off.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
