ALTER TABLE "cus_submissions"
  ADD COLUMN IF NOT EXISTS "new_customer_type" varchar(50),
  ADD COLUMN IF NOT EXISTS "new_business_address" text,
  ADD COLUMN IF NOT EXISTS "new_city_municipality" varchar(200);
