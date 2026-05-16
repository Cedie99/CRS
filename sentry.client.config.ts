import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable in development
  enabled: process.env.NODE_ENV === "production",

  // Capture 10% of transactions to stay within free tier
  tracesSampleRate: 0.1,

  // Capture replays only on errors (free tier friendly)
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
