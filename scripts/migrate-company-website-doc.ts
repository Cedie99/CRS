/**
 * Adds doc_company_website column to cis_submissions.
 * Run: npx tsx scripts/migrate-company-website-doc.ts
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE cis_submissions
      ADD COLUMN IF NOT EXISTS doc_company_website jsonb
  `;

  console.log("✓ Added doc_company_website column");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
