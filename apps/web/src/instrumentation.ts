import * as Sentry from '@sentry/nextjs';

// NFR10: registers the runtime-appropriate Sentry config (server vs. edge) —
// see sentry.server.config.ts / sentry.edge.config.ts for the actual guarded
// Sentry.init() calls.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
