# Live held-out evaluation — adjudication

Adjudicator: independent session; did not build or implement the thing under test. Inputs were limited to protocol.md, adjudicator-input/calibration-blind.json, adjudicator-input/oracle.json and answers/N1-0X-{base,variant}.md. I made no edits to skills, docs or answers.

## 1. Calibration gate (I recorded these verdicts before opening oracle.json or any answer)

| Case | Verdict | Reason |
|---|---|---|
| CAL-N1-01 | unsound | It lists remedies as buzzwords (DataLoader, JOIN, caching, batching). It never names the access pattern, evidence or pagination/scoping constraints. |
| CAL-N1-02 | unsound | A LEFT JOIN with LIMIT 25 OFFSET 50 paginates the joined parent×child rows, not the parents. That breaks the 25-parent page semantics. "One query is always better" is false. |
| CAL-N1-03 | unsound | A TTL cache hides the per-row loop rather than removing it. A cold or expired cache still issues 100 queries, and the cache adds staleness and invalidation risk. |
| CAL-N1-04 | unsound | A process-wide singleton DataLoader shares its cache across users and tenants. That leaks data across tenants and keeps stale entities. It should be per request. |
| CAL-N1-05 | unsound | "N+1 redundancy" is a capacity/failover term, not N+1 query amplification. Prescribing batching or a DataLoader misclassifies the statement. |
| CAL-N1-06 | sound | It correctly labels the code-only evidence as suspected. It rejects a pagination-breaking JOIN and pages first, then runs one grouped aggregate. It keeps tenant scope, gives a bounded query count and verifies with a trace. |

**Gate status:** I don't have the expected verdicts, so the gate is **pending the parent's comparison**. Under protocol §Scoring 1, a mismatch on any item makes everything below INVALID.

## 2. Per-answer grading

Legend: MET / NOT MET / N/A. Quotes are copied from the answer, trimmed to 20 words or fewer.

### N1-01-base — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Static loop classified as suspected pending trace | MET | "a textbook **suspected N+1 query amplification** pattern … Evidence tier is **code-only**" |
| Bounded batch prefetch / eager loading | MET | "issue one child query `WHERE user_id IN (:ids)` (chunked by bound `B`, e.g. 100)" |
| Rejection of cache-first or concurrent-per-row | MET | "Cache-first: wrapping a slow O(N) loop in a cache hides the defect instead of fixing query shape" |
| Empty relations + user ordering preserved | MET | "keeping its existing LIMIT/OFFSET (or cursor) and ORDER BY untouched" / "Empty relations serialize as `[]`" |

Invariant: satisfied. Hard failures: none.
Additional concerns: "the only acceptable caching layer" is an overbroad absolute. "independent of N growth within a chunk" is loose wording.

### N1-01-variant — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Suspected pending trace | MET | "static loop evidence is `suspected` amplification. Only a statement counter, query log, or trace … makes it `observed`" |
| Bounded batch | MET | "Statement count is Q_base + R·⌈N/B⌉ = 1 + ⌈250/100⌉ = 4" |
| Rejection of cache/concurrency | MET | "250 parallel preference queries per request converts amplification into connection-pool pressure" |
| Empty relations + ordering | MET | "users with zero preferences serialize as `[]`, not `null`; deterministic ordering by `user_id, pref_key`" |

Invariant: satisfied. Hard failures: none. It allows Redis only after batching is measured insufficient, so it does not claim the cache fixes the problem.
Additional concerns: the opening sentence calls the latency "the expected signature of O(N) query amplification" before the trace qualifier arrives. The parent ORDER BY id is introduced; it is not shown to be the existing ordering. Throughput figures rest on an assumed ~1 ms round trip, which the answer labels as an assumption.

### N1-02-base — PASS (item 4 N/A; see Limits)
| Mandatory item | Result | Quote |
|---|---|---|
| Hidden serializer traversal as entrypoint | MET | "the serializer template traverses `product.category.name` (one lazy SELECT per product)" |
| Prefetch/projection before serialization | MET | "Collect the page's distinct non-null category_ids, then Category.findByIds(ids)" |
| Aggregate pushdown for review counts | MET | "SELECT product_id, COUNT(*) FROM reviews WHERE product_id IN (...) GROUP BY product_id" |
| customer_id predicate on bookmark lookup | N/A | Bookmarks are introduced only in the variant prompt. Nearest analogue present: "both child queries retain the tenant predicate". |

Invariant: satisfied. Hard failures: none. It explicitly rejects the blanket 1:N join.
Additional concerns: it states as fact that `findAll()` has no LIMIT/OFFSET; the prompt doesn't say this, so it is an inference. Its review SQL omits the tenant predicate that its own prose requires.

### N1-02-variant — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Serializer entrypoint | MET | "The serializer template is the amplification site" |
| Prefetch before serialization | MET | "replace the two per-row traversals with bounded batch lookups keyed by the 50 parent IDs" |
| Review-count pushdown | MET | "SELECT product_id, COUNT(*) FROM review WHERE tenant_id = :tenant AND product_id IN (:ids) GROUP BY product_id" |
| customer_id predicate on bookmark | MET | "WHERE tenant_id = :tenant AND customer_id = :customer AND product_id IN (:ids)" |

Invariant: satisfied. Hard failures: none. The proposed category join is N:1 and is argued correctly as non-multiplying.
Additional concerns: it assumes `findAll()` already has LIMIT/OFFSET, which contradicts the base answer's assumption; the prompt is silent.

### N1-03-base — **FAIL**
| Mandatory item | Result | Quote |
|---|---|---|
| Per-record aggregate amplification identified | MET | "query amplification, pattern \"per-record aggregate\": Q = 2N, here 200 statements" |
| COUNT/SUM pushdown via GROUP BY | MET | "Push the aggregate down with a single grouped query" … "GROUP BY merchant_id" |
| Rejection of loading child rows into memory | MET | "Reject the \"fetch all orders into memory\" proposal." |
| Zero-order merchants → count 0, **sum 0**, not omitted | **NOT MET** | "defaulting merchants with **zero** matching orders to `0` count and `NULL`/`0` total" |

Invariant: satisfied, because aggregation stays in the database with no per-record loop. Hard failures: none triggered. Zero-order merchants are not omitted, and no NPE is asserted.
Why NOT MET: the oracle requires sum 0. The answer explicitly allows a NULL total, and its SQL uses `SUM(amount)` without COALESCE. That is the empty-aggregate NULL the oracle guards against. **Borderline call; see Limits.**
Additional concerns: point 5 ("Does not remove the scan") is muddled. The 5k-orders-per-merchant figure is illustrative and labelled "say".

### N1-03-variant — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Per-record aggregate identified | MET | "that is **per-record aggregate amplification**" |
| Pushdown | MET | "COALESCE(SUM(amount), 0) AS total_amount … GROUP BY merchant_id" |
| Rejection of in-memory | MET | "Fetching child rows to count them (memory ceiling above)" listed under "Rejected outright" |
| Zero-order merchants | MET | "the page query `LEFT JOIN`s the aggregate so they render `0`, never `null`/missing" |

Invariant: satisfied. Hard failures: none.
Additional concerns: memory and latency figures are assumption-based estimates and are labelled as such. It uses evidence tier "design risk" where the protocol's code-only tier would be "suspected"; the prompt describes queries, not code, so I accept this.

### N1-04-base — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Resolver fan-out identified | MET | "every node performs an independent round-trip: SELECT ... FROM books WHERE author_id = $1" |
| Request-scoped DataLoader with batch keys | MET | "Insert a **request-scoped DataLoader** between resolver and data access" |
| Rejection of global/cross-request cache | MET | "Instantiate loaders per request … never as a module-level singleton or global cache." |
| Tenant predicate in batched query | MET | "db.findBooksByAuthorIds(authorIds, { tenantId: ctx.tenantId })" |

Invariant: satisfied. Hard failures: none.
Additional concerns: "GraphQL executes the selection set in breadth-first order" imprecisely describes graphql-js execution. Bounded chunking requires configuring `maxBatchSize`; it is not DataLoader's default.

### N1-04-variant — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Fan-out identified | MET | "This is resolver fan-out, the GraphQL form of N+1." |
| Request-scoped DataLoader | MET | "Request-scoped `DataLoader` over the `books` relation" |
| Rejection of global cache | MET | "The global process-level cache proposal — Reject it as stated." |
| Tenant predicate in batch | MET | "every batch query carries the same tenant/organization predicates the single-key query had" |

Invariant: satisfied. Hard failures: none. Additional concerns: none material.

### N1-05-base (control) — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Recognized as bounded batch loading | MET | "The import job is already batched" |
| False-positive rejected | MET | "**False positive. The finding is rejected and no remediation is warranted.**" |
| Chunk size B vs query count and parameter limits | MET | "Larger B reduces round trips until parameter-count limits … Validate B against the driver's bind-parameter cap" |
| Batch boundary kept (no single unbounded IN) | MET | "Follow-ups are performance tuning (batch size, column projection, index verification), not defect remediation." |

Invariant: satisfied. It is classified as **not amplification**. Hard failures: none.
Additional concerns: the formula yields 21 against the actual 20; the answer explains this as a merged base query. "Static inspection alone caps this at suspected" sits awkwardly beside a definitive false-positive verdict. It never explicitly warns against a single unbounded IN; I treated keeping the batches as meeting the item.

### N1-05-variant (control) — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Bounded batch recognized | MET | "This is the canonical negative control: **already-batched loading**." |
| False positive rejected | MET | "scanner finding is a false positive — not N+1 amplification" |
| B vs query count and parameter limits | MET | "B_max = ⌊(L − k)/c⌋" plus a table for B = 10–500 and per-engine limits |
| Boundary preserved | MET | "reject B < 1, clamp to [10, 500], and assert B·c + k ≤ 0.8L" |

Invariant: satisfied. It is classified as **not amplification**. Hard failures: none.
Additional concerns: the Oracle ORA-01795 limit counts IN-list expressions, not bind parameters, so the claim that a composite key hits the ceiling is imprecise. The JOIN parenthetical is garbled.

### N1-06-base (control) — **FAIL**
| Mandatory item | Result | Quote |
|---|---|---|
| Compute redundancy vs query amplification distinguished | MET | "a lexical collision between two unrelated uses of \"N+1\"" |
| Reviewer finding rejected as lexical false positive | MET | "Withdraw the amplification finding as a false positive" |
| Failover domains **and health checks** for hot spare verified | **NOT MET** | "A hot spare sharing the config plane, credentials … with the actives is redundancy on paper only." |
| Scored under Redundancy, not Data scaling | MET | "Data scaling — No change." / "move to the **Redundancy** axis" |

Invariant: satisfied. It is classified as **not amplification**. Hard failures: none.
Why NOT MET: failure-domain independence and a node-kill drill are covered. Failure detection, spare health checks and readiness signals are never mentioned. **Borderline call; see Limits.**
Additional concerns: the claim that the spare "emits zero database queries" overstates the case, because a hot spare typically holds connections and health queries.

### N1-06-variant (control) — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Distinction | MET | "a compute high-availability pattern, an explicit negative control for N+1 query amplification" |
| Rejection | MET | "**Reject the reviewer's finding.**" |
| Failover domains + health checks | MET | "requires the spare to be promotable *at capacity*, not merely process-alive" / "No failover signal … node-saturation alert" |
| Redundancy-axis attribution | MET | "Redundancy 4/10 … AZ spread is a genuine improvement" / "Data scaling 6/10 No amplification defect evidenced" |

Invariant: satisfied. It is classified as **not amplification**. Hard failures: none.
On hard failure 3: the Data scaling score of 6/10 cites idempotency-store topology, not the redundancy nomenclature.
Additional concerns: it says the original finding was "`design risk` mislabeled `observed`", but the reviewer never claimed observed. Literal `\\le` escapes appear in the math. The P0 idempotency gate is inferred, not stated in the prompt.

### N1-07-base (control) — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Constant query count, not amplified | MET | "Two queries, constant, independent of order size: the workload is O(1) in query count" |
| DataLoader/batching rejected | MET | "DataLoader would change nothing." |
| Full scan diagnosed via EXPLAIN | MET | "EXPLAIN (ANALYZE, BUFFERS) the exact statement … seq scan vs index scan" |
| Composite index with write cost | MET | "Add the index the query owns: (action_type, created_at). Write cost is acceptable on an append-only table" |

Invariant: satisfied. It is classified as **not N+1 amplification**; the slow query runs a constant number of times. Hard failures: none.
Additional concerns: the claim that an index with created_at first "cannot use the range" is inaccurate; such an index can still serve the range, just less selectively. The "tenant-leak surface" of DataLoader is overstated.

### N1-07-variant (control) — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Constant count | MET | "Exactly 2 queries, independent of order size — Constant-count routine (2–4 fixed queries), not amplification" |
| DataLoader rejected | MET | "Reject the DataLoader change" |
| EXPLAIN full-scan diagnosis | MET | "Expect Seq Scan on ~20M rows before, Index Scan returning a handful of rows after" |
| (action_type, created_at) index + write cost | MET | "the query must stay global, the correct index is (action_type, created_at)" / "measure insert p99 during a concurrent build" |

Invariant: satisfied. It is classified as **not N+1 amplification**. Hard failures: none.
Additional concerns: the primary fix assumes `audit_logs.order_id`, a column absent from the prompt, and changes the query's semantics. The `(action_type, created_at)` index appears only as the fallback for the global query. The "<50 ms" target is unsupported.

### N1-08-base — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| LEFT JOIN corrupts parent pagination | MET | "20 output rows may be one org, or twenty orgs truncated mid-member-list." |
| Two-query bounded load with tenant on child | MET | "FROM members WHERE tenant_id = $1 AND org_id = ANY($ids) ORDER BY org_id, id, chunked at B = 50–100" |
| tenant_id on all child queries | MET | "keep it in every child query, batch loader, and DataLoader" |
| Empty member collections | MET | "Zero-member organizations must still appear, with `[]` and not `null`" |

Invariant: satisfied. Hard failures: none. The single-round-trip alternative pages parents in a subquery; it does not approve the original query.
Additional concerns: the alternative SQL (`SELECT o.* … FROM (subquery) o … GROUP BY o.id`) would be rejected by PostgreSQL, which recognizes functional dependency only on a base-table primary key.

### N1-08-variant — PASS
| Mandatory item | Result | Quote |
|---|---|---|
| Pagination corruption demonstrated | MET | "One 100-member org consumes the entire page" |
| Two-query bounded load with tenant on child | MET | "WHERE m.tenant_id = $1 AND m.org_id = ANY($ids) … Q = 1 + ⌈20/100⌉ = 2" |
| tenant_id on all child queries | MET | "applied on **both** parent and child access paths" |
| Empty collections | MET | "the serializer must emit `[]`, never `null` or a missing key" |

Invariant: satisfied. Hard failures: none.
Additional concerns:
- "LIMIT runs before de-duplication" is wrong. SQL applies DISTINCT/GROUP BY before LIMIT; the repair fails for other reasons.
- "two 100-member orgs returns 2 orgs" is wrong: LIMIT 20 yields one org.
- "2, not 21" doesn't match the single-query proposal under review.

## 3. Per-case and overall results

| Case | Base | Variant | Case |
|---|---|---|---|
| N1-01 | PASS | PASS | PASS |
| N1-02 | PASS | PASS | PASS |
| N1-03 | **FAIL** | PASS | **FAIL** |
| N1-04 | PASS | PASS | PASS |
| N1-05 (control) | PASS | PASS | PASS |
| N1-06 (control) | **FAIL** | PASS | **FAIL** |
| N1-07 (control) | PASS | PASS | PASS |
| N1-08 | PASS | PASS | PASS |

Control classification: all six control answers (N1-05, N1-06, N1-07, base and variant) classify their case as **not N+1 query amplification**. N1-07 is treated correctly as a constant-count slow query.

**Overall: FAIL. 6 of 8 cases pass; N1-03 and N1-06 fail on their base arms.** This is conditional on the calibration gate. If any calibration verdict mismatches, the adjudication is INVALID.

## 4. Limits observed

1. **Calibration gate:** I can't confirm the result because the expected verdicts are withheld from me by design.
2. **Two decisive borderline calls; I am reporting them, not softening them.** The overall FAIL rests entirely on N1-03-base item 4 (it allows a NULL total where the oracle requires sum 0) and N1-06-base item 3 (it never mentions health checks or failure detection). If both were judged MET, all 8 cases would pass. I applied the oracle text as written (protocol §5; no leniency).
3. **N/A interpretation:** I marked N1-02-base item 4 (customer_id predicate on the bookmark lookup) N/A, because bookmarks don't exist in the base prompt. A stricter reading that requires it in the base arm would also fail N1-02. That would not change the overall FAIL.
4. **Exclusion rule not checked:** examinee activity logs were outside my inputs, so I could not check protocol §Scoring 4 (excluding examinees that read benchmarks/ or artifacts/).
5. **Not checked:** the 700-word answer limit is not a scoring criterion and I did not measure it. Several answers look long, notably N1-06-variant and N1-08-base.
6. **Not run:** I executed no SQL. My SQL-semantics concerns come from reading only and don't affect verdicts.
