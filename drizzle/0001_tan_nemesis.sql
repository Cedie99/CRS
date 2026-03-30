ALTER TABLE "cis_submissions" ADD COLUMN "customer_signature" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "customer_signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "approver_signature" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "approver_signed_at" timestamp;