ALTER TABLE "cis_submissions" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "cus_submissions" ADD COLUMN "new_postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "agent_account_type";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "account_specialist_first_name";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "account_specialist_last_name";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "sales_specialist";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "sales_manager";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "tpc_first_name";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "tpc_last_name";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "agent_completion_note";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "sales_support_note";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "finance_payment_mode";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "finance_payment_term_days";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "finance_assessment_note";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "doc_cfo_credit_terms";--> statement-breakpoint
ALTER TABLE "cis_submissions" DROP COLUMN "cfo_signed_at";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "timezone";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "signature_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "signature_title";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "signature_text";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "notification_preferences";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "profile_preferences";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role_settings";