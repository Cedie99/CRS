import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
    formats: ["image/avif", "image/webp"],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps
  sourcemaps: {
    disable: false,
  },

  // Disable Sentry CLI telemetry
  telemetry: false,

  // Suppress build-time logs
  silent: true,
});
