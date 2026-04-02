/**
 * Adds JotForm-aligned columns to cis_submissions.
 * Run: npx tsx scripts/migrate-cis-form-fields.ts
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE cis_submissions
      -- Extended basic info
      ADD COLUMN IF NOT EXISTS corporate_name         VARCHAR(255),
      ADD COLUMN IF NOT EXISTS date_of_business_reg   VARCHAR(50),
      ADD COLUMN IF NOT EXISTS number_of_employees    VARCHAR(50),
      ADD COLUMN IF NOT EXISTS website                VARCHAR(255),
      ADD COLUMN IF NOT EXISTS telephone_number       VARCHAR(50),
      ADD COLUMN IF NOT EXISTS landmarks              TEXT,

      -- Delivery address
      ADD COLUMN IF NOT EXISTS delivery_same_as_office BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS delivery_address        TEXT,
      ADD COLUMN IF NOT EXISTS delivery_landmarks      TEXT,
      ADD COLUMN IF NOT EXISTS delivery_mobile         VARCHAR(50),
      ADD COLUMN IF NOT EXISTS delivery_telephone      VARCHAR(50),

      -- Business classification
      ADD COLUMN IF NOT EXISTS line_of_business       VARCHAR(100),
      ADD COLUMN IF NOT EXISTS line_of_business_other VARCHAR(255),
      ADD COLUMN IF NOT EXISTS business_activity      VARCHAR(100),
      ADD COLUMN IF NOT EXISTS business_activity_other VARCHAR(255),

      -- Ownership (dynamic rows)
      ADD COLUMN IF NOT EXISTS owners         JSONB,
      ADD COLUMN IF NOT EXISTS officers       JSONB,
      ADD COLUMN IF NOT EXISTS payment_terms  VARCHAR(50),

      -- Business background
      ADD COLUMN IF NOT EXISTS business_life       VARCHAR(50),
      ADD COLUMN IF NOT EXISTS how_long_at_address VARCHAR(50),
      ADD COLUMN IF NOT EXISTS number_of_branches  VARCHAR(50),
      ADD COLUMN IF NOT EXISTS gov_certifications  TEXT,
      ADD COLUMN IF NOT EXISTS trade_references    JSONB,
      ADD COLUMN IF NOT EXISTS bank_references     JSONB,
      ADD COLUMN IF NOT EXISTS achievements        TEXT,
      ADD COLUMN IF NOT EXISTS other_merits        TEXT,

      -- Document uploads
      ADD COLUMN IF NOT EXISTS doc_valid_id            JSONB,
      ADD COLUMN IF NOT EXISTS doc_mayors_permit       JSONB,
      ADD COLUMN IF NOT EXISTS doc_sec_dti             JSONB,
      ADD COLUMN IF NOT EXISTS doc_bir_certificate     JSONB,
      ADD COLUMN IF NOT EXISTS doc_location_map        JSONB,
      ADD COLUMN IF NOT EXISTS doc_financial_statement JSONB,
      ADD COLUMN IF NOT EXISTS doc_bank_statement      JSONB,
      ADD COLUMN IF NOT EXISTS doc_proof_of_billing    JSONB,
      ADD COLUMN IF NOT EXISTS doc_lease_contract      JSONB,
      ADD COLUMN IF NOT EXISTS doc_proof_of_ownership  JSONB,
      ADD COLUMN IF NOT EXISTS doc_store_photo         JSONB,
      ADD COLUMN IF NOT EXISTS doc_supplier_invoice    JSONB,
      ADD COLUMN IF NOT EXISTS doc_social_media        JSONB,
      ADD COLUMN IF NOT EXISTS doc_certifications      JSONB,
      ADD COLUMN IF NOT EXISTS doc_gov_certifications  JSONB,
      ADD COLUMN IF NOT EXISTS doc_other               JSONB
  `;

  console.log("✓ All new CIS form columns added successfully.");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
