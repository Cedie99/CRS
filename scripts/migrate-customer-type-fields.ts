/**
 * Adds per-customer-type columns to cis_submissions.
 * Run: npx tsx scripts/migrate-customer-type-fields.ts
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE cis_submissions
      ADD COLUMN IF NOT EXISTS petroleum_license_no    VARCHAR(100),
      ADD COLUMN IF NOT EXISTS depot_station_type      VARCHAR(50),
      ADD COLUMN IF NOT EXISTS tank_capacity           VARCHAR(100),
      ADD COLUMN IF NOT EXISTS doe_accreditation_no    VARCHAR(100),
      ADD COLUMN IF NOT EXISTS special_account_type    VARCHAR(50),
      ADD COLUMN IF NOT EXISTS special_account_remarks TEXT
  `;

  console.log("✓ Columns added successfully.");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
