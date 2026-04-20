/**
 * Safe one-time migration: adds new enum values and nullable customer_type.
 * Run with: npx tsx scripts/migrate-enums.ts
 */
import postgres from "postgres";

try { (process as any).loadEnvFile(".env.local"); } catch {}

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("Running safe enum migration…");

  // Must run outside a transaction (PostgreSQL restriction for ADD VALUE)
  await sql`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'project_development_specialist'`;

  await sql`ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'dealer'`;
  await sql`ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'distributor'`;
  await sql`ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'private_label'`;
  await sql`ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'toll_blend'`;
  await sql`ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'end_user'`;

  await sql`ALTER TYPE "cis_status" ADD VALUE IF NOT EXISTS 'pending_erp_encoding'`;

  await sql`ALTER TYPE "workflow_action" ADD VALUE IF NOT EXISTS 'agent_submitted'`;
  await sql`ALTER TYPE "workflow_action" ADD VALUE IF NOT EXISTS 'sales_support_submitted'`;

  // Make customer_type nullable if it isn't already
  await sql`ALTER TABLE "cis_submissions" ALTER COLUMN "customer_type" DROP NOT NULL`;

  // Add new agent fill-out columns (all safe with IF NOT EXISTS)
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_account_specialist_first" varchar(255)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_account_specialist_last" varchar(255)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_sales_specialist" varchar(255)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_sales_manager" varchar(255)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_tpc_first" varchar(255)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_tpc_last" varchar(255)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "doc_agent_other_requirements" jsonb`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_notes" text`;

  // Finance Information fields
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "finance_credit_limit" varchar(100)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "doc_sir_resty_signed" jsonb`;

  // Sales Support fill-out fields
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_account_type" varchar(50)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_price_list_1" varchar(100)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_price_list_2" varchar(100)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_sales_type" varchar(100)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_vat_code" varchar(100)`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_other_remarks" text`;
  await sql`ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "doc_sales_support_other" jsonb`;

  console.log("Done. All enum values added safely.");
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
