# CIS Load Test — Baseline Report

**Date:** 2026-05-16
**Environment:** Production (Vercel + Neon)
**Deployment:** `crs-lq360ksf2-jhon-cedrick-sarmiento-ignacios-projects.vercel.app`
**Dataset:** 500 seeded CIS submissions across all statuses, 18 seed users (all roles)

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
| Total requests | 2,329 |
| Throughput | 11.1 req/s |
| Avg latency | 71 ms |
| p95 latency | 108 ms |
| Checks passed | 100% |
| 5xx errors | 0 |

**Thresholds:**
- p(95) < 2000ms — **PASS** (108ms)
- Checks rate > 99% — **PASS** (100%)

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
