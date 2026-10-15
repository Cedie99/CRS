-- Add Platinum / Bagani program selection to CIS submissions
DO $$ BEGIN
  CREATE TYPE "customer_program" AS ENUM('platinum', 'bagani');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE cis_submissions ADD COLUMN IF NOT EXISTS customer_program "customer_program";
