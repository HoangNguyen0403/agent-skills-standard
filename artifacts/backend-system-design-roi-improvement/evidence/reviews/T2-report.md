# T2 — Tenant-safe retrieval and data lifecycle

Status: source edits complete within T2's three locked paths. No runtime, model, eval, or efficacy claim; no generator, build, lint, test, formatter, metadata, mirror or commit/push action. Baseline snapshot bytes untouched. Report is evidence, not acceptance.

## Changed files

| Path | Status | Bytes before → after | ≈tokens (bytes/4) | SHA256 after |
| --- | --- | --- | --- | --- |
| `skills/system-design/system-design-data-architecture/SKILL.md` | edited | 5,555 → 6,666 (+1,111) | 1,389 → 1,666 (+277) | `e673583ba86f4fb92be74924a85eb139df4476b93b5ce7ddf1730ccd591a796d` |
| `skills/system-design/system-design-data-architecture/references/flow-contracts.md` | edited | 3,788 → 4,537 (+749) | 947 → 1,134 (+187) | `6215b36242151b6238253d52dfcdbf4eaf8fe6acae137d1618aae8d2aa77281c` |
| `skills/system-design/system-design-data-architecture/references/tenant-safe-retrieval.md` | new; security-corrected | 11,597 → 12,001 (+404) | 2,899 → 3,000 | `fa37e6f2569c328b0dd9cd87d103e523968d47a2c7f0ea47932b44198683d571` |

Baseline (unchanged, from `baseline-snapshot/`): `SKILL.md` `a7ad042f5dc908d095d5f85fd8cdb5fdf09b6c961a632b961da2303e09d35211`; `flow-contracts.md` `6c107c03df3da843844ab8577272bc07fcee9a0da307d3364e4e19e24c1ac90e`.

Token footprint: body stays under the 7,168-byte soft cap; default load cost is +277 tokens. The +3,000-token reference is lazy — loaded only for scoped retrieval/cache/job/derived-copy flows, never for the existing store/sharding prompts. Approximate cl100k basis (~4 chars/token), not a measured tokenizer count; no size-based savings claimed.

## Contract extension (no fork)

- Authority is reused, not duplicated: `SKILL.md:45-46` extends the single-writer/copy rule from the existing authority contract; `flow-contracts.md:10` adds authenticated scope + derived-copy re-authorization to **Authority and copies**; `flow-contracts.md:16` adds per-stage authorization decision, revocation epoch, and invalidation/propagation bound to **Add fields when material**; `flow-contracts.md:20` traces scope through source → lexical/vector → rerank → cache → async → output.
- Routing: `SKILL.md:79` verify item, `SKILL.md:83-85` References list, and three new trigger keywords (`tenant isolation`, `multitenant retrieval`, `retrieval authorization`) that are unique to this owner. `system-design/_INDEX.md` and `skills/metadata.json` are T6-owned and deliberately not regenerated here, so generated indices are stale until T6.
- Anti-pattern `SKILL.md:71` states relevance/namespace is not authorization, matching the reference's rule (`tenant-safe-retrieval.md:7`).

## AC evidence

**AC-ROI-05 — derived retrieval/cache/job output remains constrained by authenticated tenant authority.**
- `tenant-safe-retrieval.md:19-30`: source-to-derived authority table with required control, omission failure and verification for source read, lexical index, vector index, reranker/fusion, result cache, async job, derived artifact, restore/replay.
- `tenant-safe-retrieval.md:32-39`: relevance ≠ authorization; post-filter hazard, namespace/partition as locality boundary, scope never from model/user text, similarity/top-k not access control.
- `tenant-safe-retrieval.md:40-47`: privileged DB role / RLS bypass, `FORCE RLS`, referential-integrity bypass, role matrix testing, and the copy-inherits-no-RLS point.
- `tenant-safe-retrieval.md:49-56`: pooled context — `SET LOCAL` in the query transaction, absent-by-default scope deny, rollback/pool-return reset, error path, bounded authorization cache.
- `tenant-safe-retrieval.md:78`: cross-tenant adverse timeline and the "no cross-tenant result or cache hit" verification.

**AC-ROI-06 — revoked/deleted source with surviving derived copies has an authorization/invalidation lifecycle.**
- `tenant-safe-retrieval.md:58-65`: source deletion ≠ derived deletion; revocation vs erasure; immediate denial of revoked content while physical erasure remains bounded; replay/backfill/restore fenced by epoch/tombstone; verify at the copy.
- `tenant-safe-retrieval.md:27-30`: cache re-authorize on hit; job revalidate at start and before output; derived artifact owner/trigger/bound; restore fence.
- `tenant-safe-retrieval.md:80`: deletion/revocation adverse timeline with invariant and copy-level verification.
- Existing database-lifecycle guidance (`references/database-scaling.md:76-80`, read-only dependency) is referenced by the flow contract rather than rewritten.

## Reasoning format applied (constraint → decision → timeline → invariant → verification → cost/reversal)

- `tenant-safe-retrieval.md:67-74`: decision table keyed by constraint (shared index filter, authorization-cache volume, non-atomic multi-store revocation, broad rerank pool) with an explicit reversal trigger per row.
- Invariant + verification are stated in the Rule (`:7`), the table's verification column (`:23-30`), and both timelines (`:78`, `:80`).
- Cost/reversal: partition/collection move when filter recall or latency breaches its bound; short TTL/disable reuse when revocation exceeds its bound; stop reuse on denial failures — never trade the per-stage check for isolation alone.

## Primary citations (retrieved and read 2026-10-26)

- PostgreSQL [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): owner typically bypasses, superusers/`BYPASSRLS` always bypass, `FORCE ROW LEVEL SECURITY`, referential-integrity bypass, `row_security=off` errors rather than bypassing, policy expressions run with querying role privileges.
- PostgreSQL [`SET`/`SET LOCAL`](https://www.postgresql.org/docs/current/sql-set.html): `SET LOCAL` ends with the transaction; outside a transaction it warns and has no effect.
- PgBouncer [Features — pooling feature map](https://www.pgbouncer.org/features.html): `SET`/`RESET` "Never" supported under transaction pooling.
- pgvector [README — Filtering / Multitenancy](https://github.com/pgvector/pgvector#filtering): filters applied after approximate index scan; shared approximate index lets one tenant's vectors affect others' recall/speed; list partitioning or separate tables recommended for isolation.
- Qdrant [Configure Multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/): payload/shard tenant separation; BM25/sparse statistics are shard-wide unless tenant-scoped (`idf`), i.e. ranking statistics can cross tenants.
- OWASP [LLM08:2025 Vector and Embedding Weaknesses](https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/): permission-aware vector stores, cross-context leakage in shared multi-tenant deployments.

No vendor doc is cited as proof that a filter is enforced; each is cited for the stated mechanism only.

## Candidate public prompts (for T5 binding, not graded here)

1. "We run one Postgres table with `tenant_id` and pgvector HNSW for hybrid search, plus a Redis answer cache and a rerank worker whose job payload only stores the query. Trace what can leak between tenants and what must change." — targets AC-05 through index/cache/job stages.
2. "Our API uses a shared app role that owns the tables and a PgBouncer transaction pool. Tenant context is set with `SET app.tenant_id` at session start. What is wrong and how do we make it safe?" — targets RLS bypass + pooled-context reset/error path.
3. "Tenant A deleted a document last week; search still returns it from the index and an export still includes it. Deletion job reports success. What lifecycle did we miss?" — targets AC-06 and source-vs-derived deletion.
4. "A restore from Sunday's backup brought back a customer's revoked documents and a retried backfill re-indexed them. Design the guard." — targets stale restore/replay resurrection.

## Risks, assumptions, gaps

- Authorization-cache freshness, propagation bounds, cache keys and revocation epoch are mechanism requirements, not measured values; T5/T7 must define pass conditions and any executable lane.
- No eval file, created-index, mirror or metadata update: routing for new keywords is unverified until T6 regenerates and `audit:keywords`/alignment run.
- PostgreSQL/PgBouncer/pgvector/Qdrant statements are version-qualified by their current docs; no version pin asserted. Framework RLS implementations remain outside this skill (for example `nestjs-security-isolation`).
- Authorization is not a product choice: revoked or otherwise unauthorized content must be denied immediately at every serving path, independent of pending byte erasure. The bounded product choices are physical-erasure timing and whether a non-sensitive "pending erasure" status is surfaced; a stale/freshness marker is allowed only on content the requester is still authorized to read.
- Verification performed: three-file size/hash capture, relative-link resolution in the three changed files (0 dead links), and baseline byte comparison. A post-review source read confirmed the corrected revocation/erasure split at `tenant-safe-retrieval.md:60-63,80`. No build/lint/test/generator/model run; no runtime efficacy claim.

## Corrective receipt — security review MAJOR

Review: `.agent/sdd/backend-system-design-roi-improvement/T2-security-review.md` (CHANGES REQUESTED). Confirmed defect: the combined deletion/revocation timeline allowed "reads are denied or marked" before propagation completed, so a revoked principal could receive cached protected bytes labelled stale.

Repair, inside the three T2 locks only:
- `tenant-safe-retrieval.md:60` — derived-copy record now requires an immediate deny path for revoked content plus a bounded physical-erasure bound, not a choice about denying reads.
- `tenant-safe-retrieval.md:62` — revocation denies reuse immediately at every serving path even while bytes remain; erasure remains bounded and asynchronous.
- `tenant-safe-retrieval.md:63` — while erasure is pending, revoked content is denied; a status response may carry non-sensitive pending-erasure status without the record; a staleness marker may accompany content only while current authority still permits the read.
- `tenant-safe-retrieval.md:80` — invariant now states immediate denial at every serving path before physical erasure completes, byte removal by the propagation bound, status-without-content, and no replay/restore resurrection.
- `T2-report.md:67` — replaced the earlier marked-stale policy endorsement with the explicit split between non-negotiable authorization and bounded erasure/status choices.
- Re-read `SKILL.md:46`, `flow-contracts.md:10` and the reference Rule (`:7`): one authority rule, no fork; no broadening of policy, no new engine/schema/runtime requirement.

Reviewer walk-through: t1 revocation → stale index/cache/export hit before t2 erasure. Allowed user-visible results are denial, or non-sensitive pending-erasure status; no result may contain revoked content. Still-authorized stale content may carry a freshness marker; pending byte erasure remains bounded and observable.

Hashes after repair: `tenant-safe-retrieval.md` `4d354b7cdaa725784d27a20c1014a73ddd2bc5700d4182881732bc6691a9e38d` → `fa37e6f2569c328b0dd9cd87d103e523968d47a2c7f0ea47932b44198683d571`; `SKILL.md` and `flow-contracts.md` unchanged from the reviewed hashes. Baselines in `baseline-snapshot/` and the review file were not modified. No build/test/lint/formatter/generator/model run.

## Scope notes for lead

- Evidence path and evidence-only edits follow the T2 brief; source ownership stayed inside the three locked paths.
- No T5 sealed variants were read. Existing `evals/evals.json` cases 9-10 were read only as overlap-map provenance to avoid duplicating their cases; no eval file was edited.
- Checks reported here are settlement facts for the changed source (sizes, hashes, dead-link scan, baseline byte comparison), not the consolidated `pnpm validate:all`/audit/generator run that belongs to T6.

