# Architectural Review: User Profile Endpoint Latency

## Verdict

The described loop is a textbook **suspected N+1 query amplification** pattern (`1 + N` = 26 statements for 25 users). Evidence tier is **code-only**: a `foreach` over parent records invoking a lazy relation method. That supports a design-risk finding and a mandatory verification step — not a measured bottleneck claim. Do not present 26 queries as observed until a statement counter or trace confirms it.

## Evidence Required Before Changing Code

1. **Statement count per request.** Enable ORM statement logging or a per-request query counter. Confirm the child statements scale with parent count `N`, and capture emitted SQL, bound parameters (redacted), and per-statement timings.
2. **Worst-hop trace.** Instrument the 26 statements individually. Two very different faults hide here:
   - 26 round-trips at, say, 2–3 ms RTT ≈ 50–80 ms of pure serialized latency.
   - One *unindexed* `user_preferences.user_id` lookup executed 25 times, scanning the table each time — then the loop is the multiplier, not the root cause.
   If child lookups are table scans, indexing `user_preferences(user_id)` is the smallest correct fix and belongs in the same change as de-amplification. An `EXPLAIN` plan inspects the child access path; it is not a request counter and cannot substitute for the statement log.
3. **Negative controls.** Confirm the endpoint is not already batched (`WHERE user_id IN (...)` in fixed chunks) and is not a constant-count endpoint (`O(1)` queries) that is slow for index/scan reasons. If either holds, the diagnosis changes entirely.

## Recommended Remedy

**Two-query bounded batch load**, smallest justified remedy for a 1:N relation under parent pagination:

1. Query the parent page first, keeping its existing `LIMIT`/`OFFSET` (or cursor) and `ORDER BY` untouched.
2. Collect the 25 parent IDs; issue one child query `WHERE user_id IN (:ids)` (chunked by bound `B`, e.g. 100), then group results in memory and attach.

Query cost becomes `Q_base + R·⌈N/B⌉` = `1 + 1 = 2` statements, independent of `N` growth within a chunk. Invariants to preserve:

- **Tenant/authorization scope** on the child query — never drop the tenant predicate when batching.
- **Parent pagination integrity** — do not fetch children through a multi-row join that multiplies parent rows and corrupts offset boundaries.
- **Empty relations** serialize as `[]`, never `null` or a missing key.
- **Deterministic ordering** of preferences within each user.

Where the relation is genuinely 1:1 or tiny-bounded and the endpoint returns a single user, a single bounded eager `JOIN`/prefetch is simpler and preferable.

## Rejected Alternatives

- **Blanket giant `LEFT JOIN`** across the paginated page: duplicates parent columns, inflates memory, breaks `OFFSET` semantics.
- **Cache-first**: wrapping a slow `O(N)` loop in a cache hides the defect instead of fixing query shape; a request-scoped DataLoader is the only acceptable caching layer (never global/singleton, for cross-request leakage).
- **Blind index alone**: an index does not remove 25 serial round-trips.
- **`GROUP BY` pushdown**: correct only if the endpoint needs aggregates (counts/totals), not child entity attributes.

## Verification and Rollout

- Assert emitted statement count is 2 (per chunk) in a regression test against the old 26.
- Load-test the page: compare p95 latency and queries-per-request before/after; ship behind a flag with rollback.
- Add a persistent signal: queries-per-request histogram per endpoint, alerting on growth — this is the user-visible symptom proxy, not CPU.
- Re-check memory footprint: batching trades round-trips for child rows held in memory; with 25 parents of small preference sets this is negligible, and chunk size `B` bounds it.
