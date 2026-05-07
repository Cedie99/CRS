/**
 * Migration: adds must_change_password and is_top_manager columns to users.
 * Run with: npx tsx scripts/migrate-account-management.ts
 */
import postgres from "postgres";

try { (process as any).loadEnvFile(".env.local"); } catch {}

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("Running account management migration…");

  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false`;
  console.log("✓ must_change_password column added");

  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_top_manager" boolean NOT NULL DEFAULT false`;
  console.log("✓ is_top_manager column added");

  console.log("Migration complete.");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
