ALTER TABLE "cus_submissions"
  ADD COLUMN IF NOT EXISTS "new_trade_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "new_contact_person" varchar(255),
  ADD COLUMN IF NOT EXISTS "new_contact_number" varchar(50),
  ADD COLUMN IF NOT EXISTS "new_telephone_number" varchar(50),
  ADD COLUMN IF NOT EXISTS "new_email_address" varchar(255),
  ADD COLUMN IF NOT EXISTS "new_website" varchar(255),
  ADD COLUMN IF NOT EXISTS "new_number_of_employees" varchar(50),
  ADD COLUMN IF NOT EXISTS "new_landmarks" text,
  ADD COLUMN IF NOT EXISTS "new_delivery_address" text,
  ADD COLUMN IF NOT EXISTS "new_delivery_mobile" varchar(50),
  ADD COLUMN IF NOT EXISTS "new_delivery_telephone" varchar(50);
