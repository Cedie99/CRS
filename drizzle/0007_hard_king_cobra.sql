ALTER TABLE "notifications" ALTER COLUMN "cis_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_account_type" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "account_specialist_first_name" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "account_specialist_last_name" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_specialist" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_manager" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "tpc_first_name" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "tpc_last_name" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "agent_completion_note" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_support_note" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_payment_mode" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_payment_term_days" integer;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_assessment_note" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_cfo_credit_terms" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "cfo_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "customer_code" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signature_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signature_title" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signature_text" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notification_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_settings" jsonb;--> statement-breakpoint
CREATE INDEX "cis_is_archived_idx" ON "cis_submissions" USING btree ("is_archived");