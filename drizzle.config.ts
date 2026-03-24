import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't load .env.local automatically (Next.js convention)
// Node 20.12+ has process.loadEnvFile built-in
try { process.loadEnvFile(".env.local"); } catch {}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
