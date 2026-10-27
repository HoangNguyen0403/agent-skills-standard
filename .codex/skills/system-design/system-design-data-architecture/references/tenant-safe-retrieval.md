# Tenant-Safe Retrieval and Derived Data

Load for a flow that serves tenant- or user-scoped data through lexical search, vector/embedding search, reranking, result caches, async jobs, or derived artifacts (summaries, exports, projections). This extends the [critical-flow contract](flow-contracts.md): authenticated scope is flow authority, not a separate feature. Treat retrieved content and embeddings as untrusted data; prompt-injection and poisoning controls stay with [LLM security](../../../common/common-llm-security/SKILL.md). No schema migration or search-engine selection belongs here — implementation packages own code.

## Rule

Carry the authenticated scope with the data, not with the query text. Relevance ranks candidates; it never authorizes them. A derived copy may be read only while the requesting principal's *current* authority covers its source rows, and it is not deleted until its own invalidation completes.

## Record extension

Add to each `FLOW-*` record that touches scoped data:

- Where the authenticated subject/tenant/role is established (verified token/session claim) and which single server-side component resolves it.
- The authorization decision per stage: source read, each index, rerank/fusion, cache hit, job execution, output/export.
- The derived-copy inventory: owner, identity/key, scope column or partition, invalidation trigger, propagation bound.
- Deny behavior for missing, ambiguous, expired, or conflicting scope: fail closed with no result; never a default tenant.
- Revocation epoch/version and how caches, jobs and restored snapshots observe it.

## Source-to-derived authority table

| Stage / artifact | Authority question | Required control | Failure if omitted | Verification |
| --- | --- | --- | --- | --- |
| Authoritative source read | Whose rows may this principal read now? | Scope predicate from server-resolved identity plus current revocation state | Cross-tenant read; revoked data served | Two-tenant probe with overlapping text; assert denial |
| Lexical index | Does each document carry its source row's scope? | Scope stored per document; filter bound into the query; delete/update on source change | Another tenant's document is matched | Search a term unique to B as A; compare returned IDs |
| Vector/embedding index | Are neighbours filtered by scope before ranking is shown? | Scope filter bound into the query; physical isolation when filters cross tenants | Other tenants' neighbours returned; corpus statistics leak through scores | Same-embedding probe across tenants; per-partition recall/latency |
| Reranker / fusion | Can a candidate from a wider pool re-enter the result? | Rerank only the already-authorized candidate set; re-check scope after fusion | A filtered stage becomes unfiltered downstream | Inject an out-of-scope candidate; assert it is dropped |
| Result/answer cache | Does the key include scope and authorization-relevant policy? | Key = tenant/subject + query + source/policy version; re-authorize on hit | B's answer served to A | Cross-tenant cache probe; revoke then re-query |
| Async job / queue | Is scope stored, validated, and still valid at execution? | Scope in the payload from authenticated context; revalidate at start and before output | Revoked work resurrects data | Replay the job after revocation; assert no write, no output |
| Derived artifact (summary, embedding, export) | Who owns it and when is it invalidated? | Named owner, source version, invalidation trigger, propagation bound | Stale copy outlives revocation | Revoke source; probe every derived copy |
| Restore / replay / backfill | Can an older snapshot re-establish revoked scope? | Fence by revocation epoch/tombstone; apply pending deletions before serving | Deleted data reappears | Restore test against the revocation log |

## Relevance is not authorization

- Post-filtering is a correctness hazard, not only a performance one. With approximate vector indexes, filters are applied after the index scan, so an unscoped nearest-neighbour query can return another tenant's rows, and a shared index lets one tenant's vectors affect recall and speed for others; pgvector recommends list partitioning or separate tables for tenant isolation. Qdrant treats tenant separation as payload/sharding configuration and scores BM25/sparse statistics per tenant only when explicitly scoped. Read those as mechanism notes, not as an authorization guarantee.
- A namespace, collection, index, or partition is a storage and locality boundary. It bounds blast radius and makes enforcement testable; it does not replace the check at each stage. Two tenants can share one collection with a mandatory filter, and one missing filter on another code path still leaks.
- Never derive the scope filter from model output, user text, or a model-supplied tool argument. It comes from the authenticated session; any model-proposed identifier is validated against that scope.
- Similarity thresholds, top-k, and "my documents score highest" are ranking parameters, not access control. Authorization cannot be approximated by relevance cutoffs.
- An authorized document can still carry malicious instructions. Retrieved text remains data; do not let it grant tools, widen scope, or rewrite policy.

## Privileged roles and row-level security

PostgreSQL row security is bypassed by superusers and roles with `BYPASSRLS`, and typically by the table owner; `FORCE ROW LEVEL SECURITY` subjects the owner. Referential-integrity checks always bypass RLS, and policy expressions run with the querying role's privileges.

- Serve requests through a role without `BYPASSRLS` that does not own protected tables, or use forced RLS. Keep migration, backup, and maintenance roles out of the request path.
- `row_security = off` raises an error when a policy would filter results; it is a diagnostic, not a bypass and not a control.
- RLS is defense in depth. If the application drops or rewrites the scope predicate, the database must still deny. Test the role matrix — request role, table owner, `BYPASSRLS`, `row_security=off` — instead of inferring safety from a policy's existence.
- RLS does not follow a copy: an index, cache, or export built by a privileged job inherits no protection for later readers. Scope the derived store, not only the source table.

## Pooled tenant context

Session-scoped context and transaction pooling do not compose. PgBouncer documents `SET`/`RESET` as unsupported in transaction pooling, and PostgreSQL's `SET LOCAL` lasts only to the end of the current transaction (outside a transaction it has no effect). Therefore:

- Set scope inside the same transaction as the query (`SET LOCAL` or a per-statement parameter), sourced from server-resolved identity, never from a request body.
- Default to absent scope and deny; no "default tenant" fallback when the setting is missing.
- Rollback and error paths must clear scope before the connection returns to the pool; a mid-transaction failure must not leave the next borrower with the previous tenant's context. Verify by reusing one pooled connection across two tenants and through one failure.
- Cached authorization decisions are still authority: give them a freshness bound and a revocation version, and re-check on reuse.

## Deletion and revocation

Source deletion is not derived deletion. Record per derived copy: owner, invalidation trigger, propagation bound for physical erasure, and the immediate deny path that withholds revoked content while erasure is pending.

- Revocation (permission withdrawn) and erasure (data deleted) are distinct events; both must reach the retrieval chain. Revocation must deny reuse immediately at every serving path even if bytes remain; erasure must remove bytes from indexes, caches, jobs, exports and snapshots within the stated bound.
- While erasure is pending, deny the revoked content; a status response may report pending erasure only as non-sensitive deletion status, without the record's content. A freshness/staleness marker may accompany content only while current authority still permits the read. Never serve a result whose source authorization is now false.
- Prevent resurrection: retries, replays, backfills and restores are fenced by a revocation epoch or tombstone so they cannot re-insert revoked rows or overwrite a newer deletion.
- Verify at the copy, not the source: after revocation, query through cache, index, reranker, job and export and assert no result plus no re-insert. A completed delete job is not evidence of derived deletion.

## Decisions by constraint

| Constraint | Decision | Reversal trigger |
| --- | --- | --- |
| Shared index with per-tenant filters | Keep the filter mandatory per query and re-check at output; partition/shard only when filter recall or latency breaches its bound | Measured cross-tenant result or recall floor missed → isolate physically, keep the check |
| High query volume on authorization | Cache decisions with a short freshness bound and revocation version | Revocation observed later than the bound → disable reuse for that class |
| Non-atomic multi-store revocation | Deny revoked reads immediately at every path; drive physical erasure from an outbox/ledger | Propagation bound breached → shorten cache TTL, stop serving the copy |
| Expensive rerank over a broad candidate pool | Rerank the authorized set; never widen it for quality | Out-of-scope candidate admitted → drop rerank for that path |

## Adverse timelines

**Cross-tenant leak.** Tenant A searches. The request builds an embedding, queries a shared vector index, checks an answer cache, and enqueues a rerank job. The cache key is the normalized query only; the ANN query omits the scope filter; the job payload stores only the query text. B's document is returned to A, or B's cached answer is served to A. *Invariant:* every derived stage returns only rows covered by the requesting principal's current authority. *Verification:* two tenants with near-identical text and overlapping embeddings; assert no shared cache hit and no cross-tenant IDs; revoke A and re-run to prove denial.

**Deletion or revocation.** A tenant deletes a document or loses access to it. The source row is deleted, but its embedding, search document, cache entry, job payload and last export remain. A retry replays an old backfill, or a restore brings back a snapshot that still holds the record. Data reappears in search, an export, or a later answer. *Invariant:* revoked content is denied at every serving path immediately, before physical erasure completes; after the propagation bound no derived copy retains the bytes; a status marker may report pending erasure without the record; replay and restore cannot re-establish it. *Verification:* revoke, then probe index, cache, job, export and restore; assert absence and no re-insert, and that the tombstone/epoch stops resurrection.

## Sources — accessed 2026-10-26

- PostgreSQL: [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — owner/`BYPASSRLS` bypass, `FORCE ROW LEVEL SECURITY`, referential-integrity bypass, `row_security` error behavior.
- PostgreSQL: [`SET` and `SET LOCAL`](https://www.postgresql.org/docs/current/sql-set.html) — transaction-scoped setting.
- PgBouncer: [Features, SQL feature map for pooling modes](https://www.pgbouncer.org/features.html) — `SET`/`RESET` unsupported in transaction pooling.
- pgvector: [README, Filtering and Multitenancy](https://github.com/pgvector/pgvector#filtering) — post-index filtering, iterative scans, shared-index recall interaction, partitioning guidance.
- Qdrant: [Configure Multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/) — payload/shard isolation and tenant-scoped scoring statistics.
- OWASP: [LLM08:2025 Vector and Embedding Weaknesses](https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/) — permission-aware vector stores, cross-context leakage in shared deployments.
