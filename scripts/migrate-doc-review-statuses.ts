/**
 * Adds doc_review_statuses column to cis_submissions.
 * Run: npx tsx scripts/migrate-doc-review-statuses.ts
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE cis_submissions
      ADD COLUMN IF NOT EXISTS doc_review_statuses jsonb
  `;

  console.log("✓ Added doc_review_statuses column");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
