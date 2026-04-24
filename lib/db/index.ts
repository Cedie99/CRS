import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Storing the client on the global object ensures a single pool is reused.
// In development this prevents HMR from exhausting Supabase connections;
// in production (Vercel serverless) it keeps the pool alive across warm
// invocations of the same isolate instead of creating a new one every call.
declare global {
  // eslint-disable-next-line no-var
  var __pgClient: postgres.Sql | undefined;
}

function createClient() {
  return postgres(connectionString, {
    prepare: false, // Required for Supabase pgbouncer transaction mode
    idle_timeout: 20, // Close idle connections after 20s
    max_lifetime: 60 * 30, // Recycle connections every 30 min
    max: 6, // Keep pool small — serverless functions share Supabase's limit
  });
}

const client = (globalThis.__pgClient ??= createClient());

export const db = drizzle(client, { schema });
