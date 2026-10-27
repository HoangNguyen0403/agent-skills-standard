# T2 independent security re-review (DeepSeek reviewer)

## Verdict: APPROVE — corrective MAJOR resolved; no new blocking defect in scoped source

Independent, revision-bound re-review of the corrected T2 candidate only. Separate file: `T2-security-review.md` (original CHANGES REQUESTED) and the Sol-authored `T2-security-rereview.md` remain unmodified. This is not human acceptance, runtime conformance, integrated-gate approval or efficacy evidence.

Loaded rules before verdict (MCP): file routing for the three paths returned `common-feedback-reporter`, `common-session-retrospective`, `common-skill-creator`, `common-workflow-writing`; explicit loads `common-security-audit`, `common-llm-security`, `common-code-review`, `system-design-principles`. Session compliance audit run before this report: it flags only a generic Markdown/product-management coverage warning, not a missing security rule for canonical Markdown guidance. Language/mobile rules returned by the broad router are not applicable to these files.

## Source binding (independently recomputed)

`rtk proxy shasum -a 256`, current worktree:

| Path | Current SHA-256 | Receipt anchor |
| --- | --- | --- |
| `skills/system-design/system-design-data-architecture/SKILL.md` | `e673583ba86f4fb92be74924a85eb139df4476b93b5ce7ddf1730ccd591a796d` | matches T2-report.md; unchanged pre/post repair |
| `.../references/flow-contracts.md` | `6215b36242151b6238253d52dfcdbf4eaf8fe6acae137d1618aae8d2aa77281c` | matches T2-report.md; unchanged pre/post repair |
| `.../references/tenant-safe-retrieval.md` | `fa37e6f2569c328b0dd9cd87d103e523968d47a2c7f0ea47932b44198683d571` | matches T2-report.md post-repair hash |

Baseline provenance (reused from the lead-verified T0 snapshot, spot-checked this session): `baseline-snapshot/.../SKILL.md` = `a7ad042f…d35211`, `.../flow-contracts.md` = `6c107c03…1ac90e` — both equal to T2-report.md's baseline column, so the frozen originals are untouched and the comparison base is sound. `tenant-safe-retrieval.md` is new (no baseline).

## Disposition of the confirmed MAJOR

Original finding: the combined deletion/revocation invariant permitted a revoked principal to receive cached protected bytes labelled stale. Resolved in source, not merely in the report:

- `tenant-safe-retrieval.md:60` — per-copy record now requires "the immediate deny path that withholds revoked content while erasure is pending"; erasure is a separate propagation bound.
- `:62` — "Revocation must deny reuse immediately at every serving path even if bytes remain"; erasure is bounded and asynchronous.
- `:63` — while erasure is pending, deny the content; a status response may carry only non-sensitive pending-erasure status; a freshness marker may accompany content only while current authority still permits the read; "Never serve a result whose source authorization is now false."
- `:64` / `:80` — resurrection fence (revocation epoch/tombstone) and the invariant "revoked content is denied at every serving path immediately, before physical erasure completes; after the propagation bound no derived copy retains the bytes."
- Canonical agreement: `SKILL.md:46` (scope through every retrieval stage; derived copy outlives neither revocation nor its own invalidation) and `flow-contracts.md:10` ("must re-check current authorization before reuse"), plus the rule at `tenant-safe-retrieval.md:7` (read only while *current* authority covers the source rows). `T2-report.md:67` now states the same split and no longer endorses marked-stale disclosure.

## Adverse-timeline re-walk (semantic, at the bound hashes)

Principal authorized at t0 → authority withdrawn at t1 → stale index/cache/export bytes survive until physical erasure at t2.

| Interval | Required source behavior | Evidence |
| --- | --- | --- |
| t1 cache hit | Re-authorize on hit; key includes scope + policy/source version; stale denial | `:27` (key + re-authorize), `:62` |
| t1 index/vector/rerank | Per-stage authorization; revocation epoch observed; no result from revoked source | `:19-26` (per-stage decision), `:24-25`, `:62` |
| t1 async job | Revalidate at start and before output; revoked work writes nothing | `:28`, `:62` |
| (t1,t2) export/derived artifact | Deny content; status without the record; freshness marker only if still authorized | `:29`, `:60`, `:63`, `:80` |
| t2 | Bytes removed within the stated propagation bound; tombstone/epoch blocks replay/restore re-insert | `:62`, `:64`, `:65`, `:80` |

No inspected clause now permits returning bytes whose source authorization is false. The only allowed user-visible outcomes during (t1,t2) are denial and non-sensitive pending-erasure status; labeled stale content is confined to still-authorized content. `:47` (the other "stale" occurrence) is consistency guidance, not a serving allowance; a whole-file scan for `marked|marker|stale|denied or` found no residual escape.

## AC verdicts at the bound hashes

- **AC-ROI-05 — PASS as canonical guidance.** Authenticated scope end-to-end across source read, lexical/vector, rerank/fusion, cache, async job and output/export (`:19-30`, `:32-39`, `:42-56`, `:78`), with the counterexample that defeated acceptance now resolved. Entering scope still binds to server-resolved identity, and the self-check at `:26`/`:32-39` keeps relevance from being treated as authorization.
- **AC-ROI-06 — PASS as canonical guidance.** Revocation (immediate authorization denial at every serving path) is now cleanly separated from erasure (bounded physical deletion), with copy-level inventory, invalidation triggers/bounds, epoch/tombstone fence and copy-level verification (`:15-17`, `:27-30`, `:60-65`, `:80`). Existing `database-scaling.md:76-80` lifecycle guidance remains compatible rather than forked.

## Nonblocking observations

1. `SKILL.md:46` reads "a derived copy outlives neither revocation nor its own invalidation." Under the reference's split this is correct as an authority statement, but a literal reader could take it as a byte-deletion-at-revocation requirement. That reading is stricter than the contract, so it is not a leak; the reference (`:60-63`) supplies the operative bound. No repair required before freeze.
2. `:62` uses "deny reuse" for revocation while `:63` states the serving prohibition explicitly; together they cover both cache/job reuse and direct serving. No gap, but a future edit should keep both clauses.
3. Authorization-cache freshness, propagation bounds and revocation-epoch plumbing remain mechanism requirements without measured values; T5/T7 must define pass conditions. No executable lane was run.

## Evidence limits

No source edits, builds, tests, lints, formatters, generators, model/eval calls, cloud access, commits or pushes. No T5 sealed content. Checks were SHA-256 binding, bounded source reads and semantic timeline review; these are not runtime proof, and integrated checks, human acceptance and release remain separate.
