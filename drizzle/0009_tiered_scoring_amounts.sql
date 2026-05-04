ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "annual_sales_amount" numeric(18,2);
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "net_income_amount"   numeric(18,2);
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "bank_balance_amount" numeric(18,2);
