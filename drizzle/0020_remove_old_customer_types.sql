-- Remove obsolete customer_type enum values: standard, fs_petroleum, special
-- First update any existing rows that use the old values to 'end_user'
UPDATE "cis_submissions" SET "customer_type" = 'end_user' WHERE "customer_type" IN ('standard', 'fs_petroleum', 'special');--> statement-breakpoint

-- Recreate the enum without the old values
-- PostgreSQL does not support DROP VALUE, so we rename, create new, migrate, drop old
ALTER TYPE "customer_type" RENAME TO "customer_type_old";--> statement-breakpoint
CREATE TYPE "customer_type" AS ENUM('dealer', 'distributor', 'private_label', 'toll_blend', 'end_user');--> statement-breakpoint

-- Migrate all columns that use the old enum type
ALTER TABLE "cis_submissions" ALTER COLUMN "customer_type" TYPE "customer_type" USING "customer_type"::text::"customer_type";--> statement-breakpoint
ALTER TABLE "ctr_submissions" ALTER COLUMN "current_customer_type" TYPE "customer_type" USING "current_customer_type"::text::"customer_type";--> statement-breakpoint
ALTER TABLE "ctr_submissions" ALTER COLUMN "target_customer_type" TYPE "customer_type" USING "target_customer_type"::text::"customer_type";--> statement-breakpoint
ALTER TABLE "cus_submissions" ALTER COLUMN "new_customer_type" TYPE "customer_type" USING "new_customer_type"::text::"customer_type";--> statement-breakpoint

DROP TYPE "customer_type_old";
