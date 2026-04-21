ALTER TYPE "public"."cis_status" ADD VALUE 'pending_erp_encoding' BEFORE 'erp_encoded';--> statement-breakpoint
ALTER TYPE "public"."customer_type" ADD VALUE 'dealer';--> statement-breakpoint
ALTER TYPE "public"."customer_type" ADD VALUE 'distributor';--> statement-breakpoint
ALTER TYPE "public"."customer_type" ADD VALUE 'private_label';--> statement-breakpoint
ALTER TYPE "public"."customer_type" ADD VALUE 'toll_blend';--> statement-breakpoint
ALTER TYPE "public"."customer_type" ADD VALUE 'end_user';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE 'project_development_specialist' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'agent_submitted' BEFORE 'endorsed';--> statement-breakpoint
ALTER TYPE "public"."workflow_action" ADD VALUE 'sales_support_submitted' BEFORE 'erp_encoded';--> statement-breakpoint
ALTER TABLE "cis_submissions" ALTER COLUMN "customer_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_account_specialist_first" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_account_specialist_last" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_sales_specialist" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_sales_manager" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_tpc_first" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_tpc_last" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_agent_other_requirements" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_notes" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_credit_limit" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_sir_resty_signed" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_account_type" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_price_list_1" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_price_list_2" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_sales_type" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_vat_code" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_other_remarks" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_sales_support_other" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" varchar(100) DEFAULT 'Asia/Manila' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signature_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signature_title" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signature_text" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;