/**
 * Adds sales_channel column to cis_submissions.
 * Run: npx tsx scripts/migrate-sales-channel.ts
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE cis_submissions
      ADD COLUMN IF NOT EXISTS sales_channel varchar(50)
  `;

  console.log("✓ Added sales_channel column");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
