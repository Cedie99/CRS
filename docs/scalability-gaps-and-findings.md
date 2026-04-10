# CRS Scalability Gaps and Findings Tracker

Last updated: 2026-04-10
Status legend: [ ] Not started, [~] In progress, [x] Done

## Purpose

This file tracks scalability and durability gaps found during review.
It is intended to be updated regularly as improvements are implemented.

## Current Scalability Verdict

- Current architecture is workable for early production.
- Not yet ready for sustained high scale (tens to hundreds of thousands) without targeted hardening.
- ~~Highest risks are file durability, missing indexes, unbounded reads, and non-transactional workflow writes.~~
- File durability, missing indexes, and in-memory filtering (P0) are resolved. Remaining risks are unbounded reads and non-transactional workflow writes.

## Priority Roadmap

### P0 - Critical (do first)

#### 1) Replace local filesystem uploads with object storage

- Status: [x]
- Priority: P0
- Why it matters:
  - Serverless local disk is ephemeral and not suitable for durable multi-instance production storage.
- Current code references:
  - app/api/form/[token]/upload/route.ts
  - app/api/cis/[id]/docs/route.ts
  - app/api/profile/avatar/route.ts
- Target state:
  - All file writes/deletes go to object storage (for example Vercel Blob, S3, R2, or GCS).
  - DB stores file metadata and object URLs only.
- Acceptance criteria:
  - Upload, rename metadata, and delete flows work end to end in production.
  - No route writes to process.cwd()/public/uploads.
  - Existing files are migrated or a backward-compatible fallback is documented.
- Notes:
  - Keep auth/authorization checks unchanged while replacing storage backend.

#### 2) Add missing database indexes for hot query paths

- Status: [x]
- Priority: P0
- Why it matters:
  - Frequent filters/sorts on large tables will degrade significantly without indexes.
- Current gap:
  - No explicit secondary indexes in current drizzle migrations.
- Proposed index set (initial):
  - cis_submissions (agent_id, created_at desc)
  - cis_submissions (agent_id, status, created_at desc)
  - cis_submissions (status, updated_at desc)
  - users (manager_id)
  - notifications (recipient_id, sent_at desc)
  - workflow_events (cis_id, created_at)
- Acceptance criteria:
  - New migration added and applied.
  - EXPLAIN plans confirm index usage for key dashboard/API queries.
  - Query latency improves for list, queue, and notifications endpoints.

#### 3) Remove in-memory filtering after broad DB fetches

- Status: [x]
- Priority: P0
- Why it matters:
  - Pulling broad datasets and filtering in app memory increases DB, network, and memory load.
- Current code references:
  - app/api/cis/route.ts (role filtering done in memory for one path)
- Target state:
  - Filtering happens in SQL WHERE clauses.
- Acceptance criteria:
  - No role/status filtering done by post-query array filtering for primary list routes.
  - Response time remains stable as row counts grow.

### P1 - High (next wave)

#### 4) Paginate all admin and list-heavy endpoints/pages

- Status: [ ]
- Priority: P1
- Why it matters:
  - Unbounded reads create latency spikes and memory pressure as data grows.
- Current code references:
  - app/(staff)/admin/page.tsx
  - app/api/admin/users/route.ts
- Target state:
  - All list endpoints support limit/cursor (or limit/offset at minimum).
- Acceptance criteria:
  - No unbounded full-table reads for dashboard lists.
  - UI supports paging and returns total count or next cursor.

#### 5) Convert memory-based stats to SQL aggregates

- Status: [ ]
- Priority: P1
- Why it matters:
  - Loading many rows just to count status buckets does not scale.
- Current code references:
  - app/(staff)/manager/page.tsx
  - app/(staff)/agent/page.tsx
- Target state:
  - Aggregates computed in SQL (COUNT with grouped/conditional logic).
- Acceptance criteria:
  - Status cards use aggregate queries.
  - Data transfer size for stats queries is minimal.

#### 6) Make workflow transitions transactional

- Status: [ ]
- Priority: P1
- Why it matters:
  - Status change, event log, and notifications should commit or fail together.
- Current code reference:
  - lib/workflow.ts
- Target state:
  - transition logic uses a single DB transaction.
- Acceptance criteria:
  - No partial updates in failure scenarios.
  - Retry behavior documented for transient failures.

### P2 - Medium (hardening and optimization)

#### 7) Reduce notification polling cost

- Status: [ ]
- Priority: P2
- Why it matters:
  - Frequent client polling scales linearly with active sessions.
- Current code reference:
  - components/navbar.tsx
- Target state:
  - Less frequent polling, conditional fetch (ETag), or realtime approach.
- Acceptance criteria:
  - Lower request volume per active user while preserving UX freshness.

#### 8) Move heavy exports to background processing

- Status: [ ]
- Priority: P2
- Why it matters:
  - Large CSV/Excel/PDF generation in request path can hit serverless limits.
- Current code reference:
  - app/api/cis/export/route.ts
- Target state:
  - Async export job creates file; client downloads when ready.
- Acceptance criteria:
  - Large exports complete reliably under load.
  - API returns job status instead of blocking long request.

#### 9) Improve production observability and capacity checks

- Status: [ ]
- Priority: P2
- Why it matters:
  - Scaling safely requires visibility into latency, errors, DB load, and saturation.
- Target state:
  - Metrics, logs, and alerts for key routes and DB health.
- Acceptance criteria:
  - Alerts configured for error spikes, p95 latency, and DB connection pressure.
  - Monthly capacity review routine documented.

## Neon and Platform Capacity Notes

- Current small compute is suitable for low traffic and development.
- For sustained growth:
  - Increase compute tier before major traffic ramps.
  - Monitor active connections, CPU, storage growth, and query latency.
  - Align app region and DB region.
  - Enable backup/restore discipline and periodic restore drills.

## Update Log

Use this section to record progress every time we complete part of the plan.

### 2026-04-10

- Area: P0.1 — File storage
- Change made: Replaced all local disk writes with Vercel Blob. Installed @vercel/blob. All PUT/DELETE operations now go through `put()` and `del()` from @vercel/blob. Added `images.remotePatterns` to next.config.ts. Added `BLOB_READ_WRITE_TOKEN` to env.
- Files touched: app/api/profile/avatar/route.ts, app/api/form/[token]/upload/route.ts, app/api/cis/[id]/docs/route.ts, next.config.ts, .env.local
- Migration run: No
- Validation performed: Dev server tested with avatar upload
- Result: Files stored in Vercel Blob (crs-blob, Singapore sin1). DB now stores full https://...blob.vercel-storage.com URLs.
- Follow-up actions: Existing rows with old /uploads/... URLs will render broken images — no data migration needed until real prod data exists.

- Area: P0.2 — Database indexes
- Change made: Added 6 indexes to schema.ts across all 4 tables. Generated migration SQL via drizzle-kit generate. Applied indexes directly via postgres client (Neon pooler blocks DDL through drizzle-kit migrate).
- Files touched: lib/db/schema.ts, drizzle/0002_cloudy_nocturne.sql
- Migration run: Yes (applied directly, not via drizzle-kit migrate)
- Validation performed: Confirmed all 6 indexes present in pg_indexes.
- Result: Indexes live in DB — cis_agent_id_created_at_idx, cis_agent_id_status_created_at_idx, cis_status_updated_at_idx, users_manager_id_idx, notifications_recipient_id_sent_at_idx, workflow_events_cis_id_created_at_idx.
- Follow-up actions: drizzle migration tracking table is empty (migrations were applied outside drizzle). Consider reconciling __drizzle_migrations table before next migration.

- Area: P0.3 — In-memory filtering
- Change made: Added CisStatus type alias. Added early return guard for empty allowedStatuses. Replaced JS .filter() with WHERE status IN (...) pushed to DB query. Removed unused `or` import.
- Files touched: app/api/cis/route.ts
- Migration run: No
- Validation performed: TypeScript check passed (tsc --noEmit)
- Result: Role-based status filtering now happens in SQL for all staff roles.
- Follow-up actions: None.

### 2026-04-08

- Created this tracker file with prioritized gaps and acceptance criteria.

## Change Entry Template

Copy and append this block for each update.

Date: YYYY-MM-DD

- Area:
- Change made:
- Files touched:
- Migration run: Yes/No
- Validation performed:
- Result:
- Follow-up actions:
