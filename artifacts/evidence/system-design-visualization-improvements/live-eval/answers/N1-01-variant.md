# Architectural Review: User Preference Retrieval (250/page)

## Verdict

The tenfold latency is the expected signature of $O(N)$ query amplification, not a capacity wall. Both proposed remedies (Redis in front of `getPreferences()`, a worker-thread pool around the loop) treat the symptom: they lower per-call cost or overlap calls while still issuing ~251 statements per page. Fix the query shape at the data-access layer first; cache or concurrency are only justified after batching has a measured ceiling.

## Evidence and arithmetic

Count statements: the parent page query is $Q_{base}=1$; the loop issues one child query per user. At 25 users, 26 statements; at 250 users, 251. Ratio $251/26 \approx 9.65$ — consistent with the observed tenfold latency. At ~1 ms per preference round trip, serial child time goes from ~25 ms to ~250 ms per page; at 50 pages/s that is 12,550 statements/s instead of 200/s after batching.

Provenance: static loop evidence is **`suspected`** amplification. Only a statement counter, query log, or trace showing count scaling with page size makes it **`observed`**. Capture that trace before attributing the incident to N+1; `EXPLAIN` is an access-path tool, not a request counter.

## Revised design

1. **Page parents first, keyset-preferred.** `SELECT ... FROM users WHERE <tenant/scope> ORDER BY id LIMIT 250` (or `WHERE id > :cursor`). Keep tenant and authorization predicates on the parent query.
2. **Load preferences in bounded batches.** One `SELECT user_id, pref_key, pref_value FROM user_preferences WHERE tenant_id = :t AND user_id IN (:chunk)` per chunk of $B=100$ IDs. Statement count is $Q_{base} + R\cdot\lceil N/B\rceil = 1 + \lceil 250/100 \rceil = 4$, i.e. ~4 round trips instead of 251. Use a request-scoped DataLoader if resolvers fan out, never a global one.
3. **Index to serve that path:** `(tenant_id, user_id, pref_key)` on `user_preferences`, added only after `EXPLAIN` confirms the child query scans without it; account for write cost on preference updates.
4. **Preserve invariants:** parent `LIMIT`/`OFFSET` or cursor boundaries unchanged (no blanket `LEFT JOIN`, which multiplies parent rows and shifts offsets); users with zero preferences serialize as `[]`, not `null`; deterministic ordering by `user_id, pref_key`; every child query retains the tenant predicate so a batch never crosses tenants.

## Why the two proposals are rejected as first moves

- **Redis cache:** it hides amplification rather than removing it. The page still performs 250 lookups, now 250 cache GETs plus misses; correctness now depends on an invalidation owner, a TTL, and a documented staleness bound for mutable preferences, plus stampede control on cold keys. Cost proportionality is poor: infrastructure bought before the $O(N)$ loop was reshaped.
- **Concurrent workers:** 250 parallel preference queries per request converts amplification into connection-pool pressure and tail latency; work is unchanged, and under load the pool saturates and requests queue (head-of-line blocking). Parallelism reduces elapsed time on an idle database, not load on a busy one.

## When they become justified

Add Redis only if, after batching, measured read QPS or p95 on `user_preferences` still breaches the SLO: key by `(tenant_id, user_id)`, short TTL, write-through invalidation on preference mutation, rebuildable from the owning table. Keep 250/page only if the payload and p95 budget survive; otherwise cap the page at 100 and use cursor pagination — a product decision, not a database one.

## Verification and rollout

- Statement count per request must be 4 (not 251) at 250 users; assert it in a trace test.
- p95 latency and DB CPU before/after; error budget unchanged.
- Negative controls: constant-count endpoints, already-batched `IN (...)` loaders, and N+1 spare-instance HA nodes are not defects.
- Ship behind a flag with canary comparison of statement counts and p95; rollback is a flag flip, no migration.
- Alert on queries-per-request exceeding a per-endpoint ceiling, so the loop cannot silently return.
