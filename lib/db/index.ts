import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// In development, HMR causes this module to re-execute on every file change,
// creating a new connection pool each time and quickly exhausting Supabase's
// connection limit. Storing the client on the global object ensures a single
// pool is reused across all HMR cycles for the lifetime of the dev server.
declare global {
  // eslint-disable-next-line no-var
  var __pgClient: postgres.Sql | undefined;
}

function createClient() {
  return postgres(connectionString, {
    prepare: false, // Required for Supabase pgbouncer transaction mode
    max: 5,
  });
}

const client =
  process.env.NODE_ENV === "development"
    ? (global.__pgClient ??= createClient())
    : createClient();

export const db = drizzle(client, { schema });
