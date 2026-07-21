import * as Sentry from '@sentry/node';

// NFR10 / Architecture §9: Sentry error monitoring. Same guarded-configuration
// pattern as lib/email.ts (Resend), lib/passport.ts (Google OAuth), and
// lib/r2.ts (R2) — no SENTRY_DSN configured (e.g. local dev) means Sentry
// stays off rather than the app assuming a project exists. Must be imported
// before any other application module (index.ts does this as its first
// import, after 'dotenv/config') so Sentry can observe as much of the
// module-load/request lifecycle as possible.
export const isSentryConfigured = Boolean(process.env.SENTRY_DSN);

if (isSentryConfigured) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
