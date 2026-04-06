ALTER TABLE "cis_submissions" ADD COLUMN "finance_eu" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_dl" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_dr" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_pl_ts" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_possible_points" integer;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_approved_points" integer;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_credit_terms" varchar(20);
