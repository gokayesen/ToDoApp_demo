import pino from 'pino';

// NFR10: structured (JSON) logging in the API. No pretty-printing transport —
// Railway and every other target platform consume JSON log lines directly.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  serializers: {
    err: pino.stdSerializers.err,
  },
});
