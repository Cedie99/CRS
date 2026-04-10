ALTER TABLE "cis_submissions" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "corporate_name" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "date_of_business_reg" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "number_of_employees" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "website" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "telephone_number" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "landmarks" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "delivery_same_as_office" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "delivery_landmarks" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "delivery_mobile" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "delivery_telephone" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "line_of_business" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "line_of_business_other" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "business_activity" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "business_activity_other" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "owners" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "officers" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "payment_terms" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "business_life" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "how_long_at_address" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "number_of_branches" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "gov_certifications" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "trade_references" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "bank_references" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "achievements" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "other_merits" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_valid_id" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_mayors_permit" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_sec_dti" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_bir_certificate" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_location_map" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_financial_statement" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_bank_statement" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_proof_of_billing" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_lease_contract" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_proof_of_ownership" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_store_photo" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_supplier_invoice" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_social_media" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_certifications" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_gov_certifications" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doc_other" jsonb;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "petroleum_license_no" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "depot_station_type" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "tank_capacity" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "doe_accreditation_no" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "special_account_type" varchar(50);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "special_account_remarks" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "customer_signature_seal" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "approver_signature_seal" text;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_eu" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_dl" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_dr" varchar(100);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_pl_ts" varchar(255);--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_possible_points" integer;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_approved_points" integer;--> statement-breakpoint
ALTER TABLE "cis_submissions" ADD COLUMN "finance_credit_terms" varchar(20);--> statement-breakpoint
CREATE INDEX "cis_agent_id_created_at_idx" ON "cis_submissions" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cis_agent_id_status_created_at_idx" ON "cis_submissions" USING btree ("agent_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cis_status_updated_at_idx" ON "cis_submissions" USING btree ("status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_recipient_id_sent_at_idx" ON "notifications" USING btree ("recipient_id","sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "users_manager_id_idx" ON "users" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "workflow_events_cis_id_created_at_idx" ON "workflow_events" USING btree ("cis_id","created_at");