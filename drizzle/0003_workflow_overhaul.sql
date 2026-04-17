-- Expand role enum
ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'project_development_specialist';--> statement-breakpoint

-- Expand customer_type enum
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'dealer';--> statement-breakpoint
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'distributor';--> statement-breakpoint
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'private_label';--> statement-breakpoint
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'toll_blend';--> statement-breakpoint
ALTER TYPE "customer_type" ADD VALUE IF NOT EXISTS 'end_user';--> statement-breakpoint

-- Expand cis_status enum
ALTER TYPE "cis_status" ADD VALUE IF NOT EXISTS 'pending_erp_encoding';--> statement-breakpoint

-- Expand workflow_action enum
ALTER TYPE "workflow_action" ADD VALUE IF NOT EXISTS 'agent_submitted';--> statement-breakpoint
ALTER TYPE "workflow_action" ADD VALUE IF NOT EXISTS 'sales_support_submitted';--> statement-breakpoint

-- Make customer_type nullable (was NOT NULL)
ALTER TABLE "cis_submissions" ALTER COLUMN "customer_type" DROP NOT NULL;--> statement-breakpoint

-- Agent fill-out columns
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_account_specialist_first" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_account_specialist_last" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_sales_specialist" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_sales_manager" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_tpc_first" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "agent_tpc_last" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "doc_agent_other_requirements" jsonb;--> statement-breakpoint

-- Sales support fill-out column
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "sales_support_notes" text;
