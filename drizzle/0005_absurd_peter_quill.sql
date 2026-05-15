CREATE TABLE "ctr_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ctr_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ctr_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cis_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"target_customer_type" varchar(50) NOT NULL,
	"reason" text,
	"required_doc_slots" jsonb,
	"required_docs_note" text,
	"doc_valid_id" jsonb,
	"doc_mayors_permit" jsonb,
	"doc_sec_dti" jsonb,
	"doc_bir_certificate" jsonb,
	"doc_location_map" jsonb,
	"doc_financial_statement" jsonb,
	"doc_bank_statement" jsonb,
	"doc_proof_of_billing" jsonb,
	"doc_lease_contract" jsonb,
	"doc_proof_of_ownership" jsonb,
	"doc_store_photo" jsonb,
	"doc_supplier_invoice" jsonb,
	"doc_social_media" jsonb,
	"doc_company_website" jsonb,
	"doc_iso_certification" jsonb,
	"doc_halal_certificate" jsonb,
	"doc_other" jsonb,
	"finance_credit_limit" varchar(100),
	"finance_credit_terms" varchar(20),
	"finance_metric_points" jsonb,
	"before_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cus_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cus_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cus_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cis_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"note" text,
	"doc_valid_id" jsonb,
	"doc_mayors_permit" jsonb,
	"doc_sec_dti" jsonb,
	"doc_bir_certificate" jsonb,
	"doc_location_map" jsonb,
	"doc_financial_statement" jsonb,
	"doc_bank_statement" jsonb,
	"doc_proof_of_billing" jsonb,
	"doc_lease_contract" jsonb,
	"doc_proof_of_ownership" jsonb,
	"doc_store_photo" jsonb,
	"doc_supplier_invoice" jsonb,
	"doc_social_media" jsonb,
	"doc_company_website" jsonb,
	"doc_iso_certification" jsonb,
	"doc_halal_certificate" jsonb,
	"doc_other" jsonb,
	"new_trade_name" varchar(255),
	"new_contact_person" varchar(255),
	"new_contact_number" varchar(50),
	"new_telephone_number" varchar(50),
	"new_email_address" varchar(255),
	"new_website" varchar(255),
	"new_number_of_employees" varchar(50),
	"new_customer_type" varchar(50),
	"new_business_address" text,
	"new_city_municipality" varchar(200),
	"new_landmarks" text,
	"new_delivery_address" text,
	"new_delivery_mobile" varchar(50),
	"new_delivery_telephone" varchar(50),
	"finance_credit_limit" varchar(100),
	"finance_credit_terms" varchar(20),
	"finance_metric_points" jsonb,
	"doc_sir_resty_signed" jsonb,
	"before_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cis_submissions" ALTER COLUMN "customer_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."customer_type";--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('dealer', 'distributor', 'private_label', 'toll_blend', 'end_user');--> statement-breakpoint
ALTER TABLE "cis_submissions" ALTER COLUMN "customer_type" SET DATA TYPE "public"."customer_type" USING "customer_type"::"public"."customer_type";--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "sales_channel" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_company_website" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_iso_certification" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_halal_certificate" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "annual_sales_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "net_income_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "bank_balance_amount" numeric(18, 2);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_review_statuses" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_metric_points" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "direct_fill" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "cus_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "ctr_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_top_manager" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ctr_events" ADD CONSTRAINT "ctr_events_ctr_id_ctr_submissions_id_fk" FOREIGN KEY ("ctr_id") REFERENCES "public"."ctr_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ctr_events" ADD CONSTRAINT "ctr_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ctr_submissions" ADD CONSTRAINT "ctr_submissions_cis_id_cis_submissions_id_fk" FOREIGN KEY ("cis_id") REFERENCES "public"."cis_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ctr_submissions" ADD CONSTRAINT "ctr_submissions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cus_events" ADD CONSTRAINT "cus_events_cus_id_cus_submissions_id_fk" FOREIGN KEY ("cus_id") REFERENCES "public"."cus_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cus_events" ADD CONSTRAINT "cus_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cus_submissions" ADD CONSTRAINT "cus_submissions_cis_id_cis_submissions_id_fk" FOREIGN KEY ("cis_id") REFERENCES "public"."cis_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cus_submissions" ADD CONSTRAINT "cus_submissions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ctr_events_ctr_id_idx" ON "ctr_events" USING btree ("ctr_id","created_at");--> statement-breakpoint
CREATE INDEX "ctr_agent_id_created_at_idx" ON "ctr_submissions" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ctr_cis_id_idx" ON "ctr_submissions" USING btree ("cis_id");--> statement-breakpoint
CREATE INDEX "ctr_status_created_at_idx" ON "ctr_submissions" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cus_events_cus_id_idx" ON "cus_events" USING btree ("cus_id","created_at");--> statement-breakpoint
CREATE INDEX "cus_agent_id_created_at_idx" ON "cus_submissions" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cus_cis_id_idx" ON "cus_submissions" USING btree ("cis_id");--> statement-breakpoint
CREATE INDEX "cus_status_created_at_idx" ON "cus_submissions" USING btree ("status","created_at" DESC NULLS LAST);