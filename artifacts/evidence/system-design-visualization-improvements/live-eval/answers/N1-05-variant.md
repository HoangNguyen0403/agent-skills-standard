# Verdict: scanner finding is a false positive — not N+1 amplification

## Why the classification is wrong

The scanner matched the *shape* (`for` loop containing `SELECT ... IN (?)`) without measuring statement count against parent count.

Expected statement count for this job:

$$Q = \left\lceil \frac{N}{B} \right\rceil = \left\lceil \frac{1000}{50} \right\rceil = 20$$

That is the bounded-batch form $Q_{base} + R \cdot \lceil N/B \rceil$ with $Q_{base}=0$ (IDs come from the job input, not a parent query), $R=1$, $B=50$. N+1 is $1 + N$ = **1001** statements here — a 50× difference in the counter the scan never took.

This is the canonical negative control: **already-batched loading**. Each statement is one fixed round trip carrying 50 keys, not one statement per entity. No per-row lazy load, per-record aggregate, or resolver fan-out inside the loop.

Evidence tier: static inspection only → label `suspected`, refuted by arithmetic on the stated batch bound. Declaring a measured bottleneck, or "fixing" it with a giant `JOIN` (row multiplication, keeps pagination irrelevant here because the job takes no page) or a cache (hides nothing; the queries are already set-shaped) would be the actual defect.

**What would make it real N+1:** $B=1$; a relation or aggregate issued inside the loop per returned row; or a serializer walking children of each returned item. None are in the described code. Verify with a statement counter on one run: expect 20, constant in per-row changes.

## Chunk size vs. query count ($N$ = 1,000)

| $B$ | Statements $\lceil N/B \rceil$ | Round trips @ ~1 ms RTT |
| --- | --- | --- |
| 10 | 100 | ~100 ms overhead |
| 50 (current) | 20 | ~20 ms |
| 100 | 10 | ~10 ms |
| 500 | 2 | ~2 ms |

Total rows returned and total index work are invariant (≈1,000 rows either way). What changes is per-statement overhead: network RTT, parse/plan, and IN-list construction. Latency is roughly $c_0 \cdot \lceil N/B \rceil$, so gains diminish hyperbolically; past ~$B=100$ you save single-digit milliseconds while paying real costs.

Costs of large $B$: bigger IN-list plans (bitmap/sort per element), larger bind payload, wider memory per result set, longer lock/snapshot hold per statement, and a hard cliff at the parameter limit. Default 50–100 is the boring right answer; 500 buys ~18 ms and risks the cliff below.

## Parameter limits — the binding constraint on the upper bound

Placeholder/bind-parameter ceilings per statement differ by engine:

- **PostgreSQL**: 65,535 bind parameters (Int16 protocol field) — also 65,535 per extended-protocol message.
- **MySQL/MariaDB**: 65,535 placeholders per prepared statement; `max_allowed_packet` bounds the text, not the count.
- **SQL Server**: 2,100 parameters.
- **Oracle**: 1,000 items in an `IN` list (`ORA-01795`).
- **SQLite**: `SQLITE_MAX_VARIABLE_NUMBER` 999 (legacy) / 32,766 (≥3.32).

So $B=500$ is safe for single-column keys on every engine above, but the bound is not $B$ — it is parameter *count*:

$$B_{max} = \left\lfloor \frac{L - k}{c} \right\rfloor$$

with $L$ the engine limit, $k$ other binds in the statement (tenant, status, cursor), $c$ params per key (1 for a scalar `id`, 2 for a composite or tuple key). A composite key at $B=500$ is 1,000 params — already at Oracle's IN-list ceiling and needing margin elsewhere.

## Required change to make 10–500 safe

1. Validate the configured $B$ at startup, not on the first job: reject $B < 1$, clamp to `[10, 500]`, and assert $B \cdot c + k \leq 0.8L$ for the target engine. Fail fast with the computed limit in the message.
2. Keep chunking key-based, not offset-based; `IN` does not preserve input order — add an explicit `ORDER BY` (and any required output ordering) if downstream depends on it.
3. Keep the tenant/authorization predicates on every chunk query; a batch must never widen scope.
4. Handle the empty-input case as zero statements returning `[]`, not one malformed query.
5. Verify with a statement counter across $B \in \{10, 50, 500\}$: expect exactly $\lceil N/B \rceil$ statements and identical result sets (same rows, same order).

No index, cache, queue, or join is warranted by anything observed. The only justified corrections are bound validation and deterministic ordering.
