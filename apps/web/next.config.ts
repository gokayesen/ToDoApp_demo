import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// NFR10: source-map upload at build time needs org/project (+ SENTRY_AUTH_TOKEN
// in CI) on top of the runtime DSN the three instrumentation files already
// guard on — skip wrapping entirely rather than let an unconfigured Sentry
// project affect local/CI builds, same guarded-optional-service pattern used
// throughout the API (Resend, R2, Google OAuth).
export default process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
    })
  : nextConfig;
