ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "doc_iso_certification" jsonb;
ALTER TABLE "cis_submissions" ADD COLUMN IF NOT EXISTS "doc_halal_certificate" jsonb;
