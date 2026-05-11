-- CTR (Customer Type Reclassification) tables

CREATE TABLE IF NOT EXISTS "ctr_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cis_id" uuid NOT NULL REFERENCES "cis_submissions"("id"),
  "agent_id" uuid NOT NULL REFERENCES "users"("id"),
  "status" text NOT NULL DEFAULT 'draft',
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
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ctr_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ctr_id" uuid NOT NULL REFERENCES "ctr_submissions"("id"),
  "actor_id" uuid NOT NULL REFERENCES "users"("id"),
  "action" text NOT NULL,
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ctr_agent_id_created_at_idx" ON "ctr_submissions" ("agent_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ctr_cis_id_idx" ON "ctr_submissions" ("cis_id");
CREATE INDEX IF NOT EXISTS "ctr_status_created_at_idx" ON "ctr_submissions" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "ctr_events_ctr_id_idx" ON "ctr_events" ("ctr_id", "created_at");
