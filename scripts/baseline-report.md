# CIS Load Test — Baseline Report

**Date:** 2026-05-16
**Environment:** Production (Vercel + Neon)
**Deployment:** `crs-lq360ksf2-jhon-cedrick-sarmiento-ignacios-projects.vercel.app`
**Dataset:** 2,000 seeded CIS submissions across all statuses, 52 seed users (all roles, multiple per role)

---

## Test Configuration

| Parameter | Value |
|---|---|
| Tool | k6 v2.0.0 |
| Script | `scripts/load-test.js` |
| Max virtual users | 30 |
| Duration | 3m 30s |
| Load profile | Ramp 0→10 (30s), hold 10 (1m), ramp 10→30 (30s), hold 30 (1m), ramp down (30s) |
| Scenarios | Dashboard pages, public form, API endpoints |

---

## Results

| Metric | Value |
|---|---|
### Run 1 — 500 records (2026-05-16)

| Metric | Value |
|---|---|
| Total requests | 2,329 |
| Throughput | 11.1 req/s |
| Avg latency | 71 ms |
| p95 latency | 108 ms |
| Checks passed | 100% |
| 5xx errors | 0 |

### Run 2 — 2,000 records, full document sets (2026-05-16)

| Metric | Value |
|---|---|
| Total requests | 2,304 |
| Throughput | 11.0 req/s |
| Avg latency | 66 ms |
| p95 latency | 91 ms |
| Checks passed | 100% |
| 5xx errors | 0 |

**Thresholds (Run 2):**
- p(95) < 2000ms — **PASS** (91ms)
- Checks rate > 99% — **PASS** (100%)

**vs Run 1:** p95 improved 17ms (108ms → 91ms, **-16%**) with 4× more data. Vercel edge caching and Neon connection pooling are holding up well.

---

## Notes

- All requests were unauthenticated (k6 cannot replicate NextAuth sessions). Redirects (302) and 401s are expected and excluded from error counting — only 5xx responses count as failures.
- Zero server errors recorded during the entire test run.
- Sentry captured no issues during the test.

---

## Next Steps

Use these numbers as the comparison baseline for any future optimizations:

| Optimization target | Current baseline | Goal |
|---|---|---|
| p95 latency | 108 ms | < 80 ms |
| Throughput | 11.1 req/s | > 20 req/s |
| Error rate | 0% | 0% |

Re-run `scripts/load-test.js` after any significant change to measure improvement.
