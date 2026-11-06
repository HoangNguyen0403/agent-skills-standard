# Implementation Plan: Sync Reliability and Attribution

Status: PLAN APPROVED by Hoang Nguyen on 2026-11-04; implementation subsequently authorized and in progress. S0 corrected design independently approved; implementation acceptance and release gates remain open.
Owner / product and release authority: Hoang Nguyen  
Engineering owner: assigned implementer per slice; integration owner: orchestrator  
QA owner: integration verifier, separate from each implementer  
Delivery mode: extended (source integrity, persisted cache, and attribution boundaries)  
Complexity: high [INFERENCE]; estimates below are relative size, not delivery commitments  
Date: 2026-11-04

## 1. Decision brief

**Recommendation:** preserve strict verification and snapshot-correct attribution. Reduce unnecessary GitHub requests; fail clearly on throttling; make license changes visible and consented; correct misleading version/config discovery. Ship in bounded PRs rather than one cache/licensing rewrite.

**Approval recorded:** Hoang Nguyen approved this scope, proposed behavioral defaults, and implementation decomposition in this conversation on 2026-11-04 (`approve plan`). This does not authorize publishing, retagging releases, changing licenses, importing credentials, or a particular paid agent route. Before dispatch, select eligible profiles explicitly; no native scout/default-model calls. Independent review must be separately owned and follow the approved routing policy.

**Approved scope amendment:** Hoang Nguyen selected `persistent_cache_scope: Defer persistent cache` and `corrective_route: Extra DeepSeek correction` in this conversation. Persistent disk caching, persisted conditional metadata, REQ-004 / AC-007–009, and slice S5 are deferred from this change; their original design text below is retained for historical traceability, not current delivery or verification obligations. Remove unintegrated S5 helpers/tests; introduce no native addon/helper. Session caching/deduplication, REQ-001–003 and REQ-005–012, AC-001–006 and AC-010–023 remain subject to their existing gates, including MAINT-only S6. One additional correction on the original Personal - DeepSeek workers is authorized for the blocked retained slices; no automatic further retry or model change follows. This amendment makes no implementation, security, licensing, or release PASS claim.

**Already delivered:** [PR #288](https://github.com/HoangNguyen0403/agent-skills-standard/pull/288) is MERGED, merge commit `a5ab1fac253b3ce5023b262720b57e743feff7cb`. It refreshes refs/manifests after accepted updates. Retain its regression coverage; do not rebuild that fix. Repository state/CLI publication must be rechecked at implementation start; merge is not proof of installed version or npm publication.

**Impact if wrong:** cache/source mismatches can accept incorrect content; licensing shortcuts can distribute incorrect notices; aggressive retries prolong throttling; permissive migrations can silently alter selections.

**Independently design-ready:** request classification/deduplication, config validation/update ordering, attribution provenance/preview. Persistent-cache implementation needs its bounded storage contract reviewed first. Republishing historical TypeScript content as MIT requires maintainer licensing approval and is blocked only for that release slice.

## 2. Outcome and evidence

Outcome: a developer can sync pinned skills without redundant discovery requests, recover from GitHub throttling with actionable diagnostics, and understand exactly why installed LICENSE/NOTICE bytes change.

Validation targets: deterministic request-count bounds, zero new discovery requests after throttling is detected, no accepted unverified cache bytes, no silent attribution replacement, no automatic semantic-version downgrade. These are fixture-measured invariants, not claims of production latency or guaranteed avoidance of all rate limits.

### Confirmed evidence

| ID | Observation | Source |
| --- | --- | --- |
| E1 | Tree failures, including 403, are logged and returned as null, losing structured rate-limit information. | `cli/src/services/GithubService.ts:78-94` |
| E2 | Requests attach Authorization only when the supplied token is present; SyncService reads `GITHUB_TOKEN`. `gh` login is not automatically imported. | `GithubService.ts:59-69`; `SyncService.ts:228-235`; `cli/src/index.ts:24-25` |
| E3 | GitHub client has no request cache; callers separately resolve refs and acquire trees. Update acceptance currently triggers a necessary second resolution. | `GithubService.ts`; `install/RefResolver.ts:100-105`; `SyncService.ts:1147-1198`; `commands/sync.ts:176-182` |
| E4 | Sync catches errors and logs them without setting a failing exit status in that catch. | `cli/src/commands/sync.ts:272-278` |
| E5 | Package-specific LICENSE/NOTICE wins; otherwise root attribution from the selected release tree is copied into the package. Root attribution is blob-verified but excluded from category-manifest verification. | `SkillSyncService.ts:292-333,359-368,430-434` |
| E6 | Root LICENSE at `typescript-v1.3.4` is Apache-2.0; no package LICENSE exists at that tag for typescript-language. Current checkout root LICENSE is MIT. | [tagged LICENSE](https://github.com/HoangNguyen0403/agent-skills-standard/blob/typescript-v1.3.4/LICENSE); local `LICENSE`; live GitHub contents checks during diagnosis |
| E7 | Version update candidates are based on ref inequality, not semantic-version ordering. | `SyncService.ts:1156-1179` |
| E8 | Legacy parser recognizes a bare category before block-form `exclude`; normalization preserves unknown keys. The affected user's actual config has not been inspected. | `ConfigService.ts:224-245,328-366`; user log `Discovering exclude (main)` |
| E9 | Lock entries store source/output digests, but no explicit per-package attribution origin record. | `LockfileService.ts:18-28,84-93` |
| E10 | GitHub documents primary/secondary limits, Retry-After/reset handling, and conditional-request guidance. | [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api); [API best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api) |

Limits: the screenshot proves installed MIT-to-Apache replacement, not which historical installer wrote MIT. No legal authority to relicense third-party content is inferred. No production request-volume measurements exist. Earlier local whole-project TypeScript checks failed; do not label a future baseline clean without evidence.

## 3. Scope inventory

All leaves below are in scope unless marked otherwise:

- Reduce GitHub requests: session deduplication; commit-keyed tree reuse; shared attribution downloads; conditional mutable-metadata requests; bounded persistent verified public-content cache.
- Handle remote failures: distinguish throttling/access/missing data; stop queued discovery; safe auth guidance; truthful CLI/JSON exit outcomes.
- Preserve source identity: final-ref resolution; commit-bound trees/content; manifest matching; moved-tag detection; existing legacy no-manifest compatibility without widening it.
- Preserve attribution: package-vs-root precedence; exact bytes; provenance; changes preview/consent; legacy-install qualification; cross-agent parity; maintainer-approved forward release repair.
- Correct selection: semantic-version update direction; reserved-key/category validation; indentation-aware legacy exclusions; actionable diagnostics without destructive guessed migrations.
- Verify and release: focused behavioral regressions, isolated real CLI smoke, independent review, docs/changelog, patch versioning and CI.

Excluded: switching to the current main/develop LICENSE for old releases; rewriting tags/assets; automatic relicensing; automatic `gh` token import; credential rotation; bypassing integrity/ownership checks; silently dropping bad categories; blanket retry-on-403; automatic rollback/downgrade; general crash-atomic installation redesign; host/OMP routing-control implementation. Private-registry persistent caching and an explicit offline mode are deferred, not claimed by this release. Existing private-registry network behavior remains supported.

## 4. Canonical requirements

Objective O1: dependable, understandable sync without weakening source or attribution integrity. All requirements below serve O1. Owners: ENG = slice implementer; QA = integration verifier; MAINT = Hoang Nguyen. Every row is Proposed, not Approved.

| ID | Requirement | Owner | Priority |
| --- | --- | --- | --- |
| REQ-001 | Deduplicate session requests and reuse discovery only for identical resolved source identities. | ENG | P1 |
| REQ-002 | Classify remote failures and stop further acquisition on confirmed rate limiting. | ENG | P0 |
| REQ-003 | Return truthful nonzero failure outcomes and safe recovery/auth diagnostics. | ENG | P0 |
| REQ-004 | Reuse bounded, verified public content across runs without trusting mutable refs or local cache claims. | ENG | P1 |
| REQ-005 | Keep final refs, commit/tree/content identity, manifests, and lock provenance consistent. | ENG | P0 |
| REQ-006 | Preserve attribution bytes from their actual selected source and record their origin. | ENG | P0 |
| REQ-007 | Preview and separately authorize attribution changes before installation/config publication. | ENG / MAINT | P0 |
| REQ-008 | Resolve intended MIT distribution through a qualified forward release, not license text replacement. | MAINT | P0 |
| REQ-009 | Offer newer compatible category/workflow/specialist versions, never incidental downgrades or named-ref replacements. | ENG | P1 |
| REQ-010 | Prevent exclusion/config keys from becoming fetched categories; preserve valid custom registry categories. | ENG | P1 |
| REQ-011 | Preserve installed managed state on acquisition/integrity/attribution-preflight failure. | ENG | P0 |
| REQ-012 | Qualify the integrated CLI, compatibility, documentation, and release evidence. | QA / MAINT | P0 |

### Canonical acceptance criteria

Each row has one verification lane and one observable contract; slice sections reference these IDs rather than redefining them.

| ID | Req | Given / when | Expected result | Owner | Lane |
| --- | --- | --- | --- | --- | --- |
| AC-001 | 01 | Multiple consumers concurrently request the same repository/commit tree. | One network tree request serves them; unrelated commits remain distinct. | QA | integration |
| AC-002 | 01 | Accepted updates resolve a ref already requested in that invocation. | Resolution is coalesced; failed requests do not poison later legitimate recovery. | QA | integration |
| AC-003 | 02 | API returns primary exhaustion (403/429, remaining=0). | Sync stops scheduling remote acquisition and returns reset-aware failure; already-in-flight work is bounded/settled and cannot publish. | QA | integration |
| AC-004 | 02 | Secondary throttling supplies Retry-After, or 403 is ordinary denied access. | Throttling gets correct guidance without a retry storm; access denial is not mislabeled quota exhaustion. | QA | integration |
| AC-005 | 03 | Sync fails through normal or JSON invocation. | Process exits nonzero, output describes one failure outcome, and no success summary is emitted. | QA | CLI smoke |
| AC-006 | 03 | Token is present/absent and a request fails. | Diagnostics report auth presence and remediation without exposing token/header values or importing ambient credentials. | QA | integration |
| AC-007 | 04 | A public immutable package is cached with validated source evidence and the same commit is selected again. | Content/tree downloads are avoided where eligible; current metadata/ref authorization checks are not silently skipped. | QA | integration |
| AC-008 | 04 | Cache bytes/evidence are corrupt, mismatched, partial, oversized, or symlink-substituted. | They cannot satisfy verification; cache is rejected safely and any refetch follows the same failure rules. | QA | integration |
| AC-009 | 04 | Metadata endpoint returns authenticated 304 after a valid conditional request. | Previously validated metadata for that exact request/auth scope is reused; 304 without a usable body is not treated as empty success. | QA | integration |
| AC-010 | 05 | Two tags share a commit, a different tag has another commit, or a tag moves between runs. | Only identical commit trees are shared; moved-source detection and matching release verification remain effective. | QA | integration |
| AC-011 | 05 | Changed/new package bytes or tampered bytes follow an accepted version update. | Existing PR #288 guarantees remain: correct bytes pass, tampered bytes fail, final provenance matches. | QA | integration |
| AC-012 | 06 | Package attribution exists, or only selected-source root attribution exists. | Correct precedence and exact bytes are preserved, with source path/ref/commit/digest and verification basis recorded. | QA | integration |
| AC-013 | 06 | Historical tag has Apache root attribution and current branch has MIT. | Sync never substitutes current-branch MIT for the pinned historical source. | QA | integration |
| AC-014 | 07 | Existing installed attribution differs from the proposed source, including addition/removal or an unqualified legacy record. | Preview identifies package, old/new digest and origin; no silent overwrite or invented old-source provenance occurs. | QA | integration |
| AC-015 | 07,11 | Attribution change is declined, or non-interactive sync lacks its separate consent. | Preflight fails/cancels without publishing config refs, installed outputs, or lock changes. Ordinary --yes is insufficient. | QA | CLI smoke |
| AC-016 | 07 | Explicit attribution consent is supplied for a specific computed sync plan. | Only that plan's verified attribution changes may publish; changed inputs require renewed qualification. | QA | integration |
| AC-017 | 08 | MAINT approves a documented licensing/provenance assessment for a new release. | New immutable category release contains approved source/license/NOTICE bytes and matching manifests; old releases remain untouched. | MAINT | release qualification |
| AC-018 | 09 | Advertised version is lower/equal/newer, prerelease, branch, or commit relative to configured source. | Stable semver upgrades only are offered automatically; lower/equal and incomparable explicit pins are not replaced. | QA | integration |
| AC-019 | 10 | Valid JSON/YAML or legacy block/inline include/exclude configuration is loaded. | Intended membership is preserved and no include/exclude/ref key becomes a category. | QA | integration |
| AC-020 | 10 | Reserved key/malformed category is found, or a custom registry defines a legitimate category. | Malformed input fails before remote acquisition with a precise path; valid custom categories still work, without local hardcoded category allowlists. | QA | integration |
| AC-021 | 11 | Preflight acquisition, integrity verification, or attribution qualification fails. | Existing managed files, lock, and saved requested refs retain their pre-run bytes. | QA | CLI smoke |
| AC-022 | 12 | All slices are integrated and built. | Real entrypoint passes isolated acceptance/decline/dry-run/tamper/rate-limit/license-change scenarios and produces installed-byte/source evidence. | QA | CLI smoke |
| AC-023 | 12 | Release PR is prepared. | Affected tests/build/docs and independent-review receipts are explicit; failing/not-run checks are not reported PASS. | MAINT | release review |

## 5. Proposed shared contracts and decisions

These are design inputs requiring approval, not existing APIs.

### Source and request identity

One final source context carries registry identity, requested ref, resolved commit, tree identity, and matching release manifest identity. Ref selection must finish before acquisition. Prefer resolving the final plan once rather than restoring the stale-manifest ordering to save requests. Preserve the merged safety fix until replacement orchestration proves AC-011.

Session caches include request URL/representation and auth context; commit-tree reuse is keyed by registry/repository/commit. Concurrent callers share one pending request. Transient failures are evicted. Do not persist bearer tokens or treat a tag string as immutable. Fetch root LICENSE/NOTICE once per selected source, not separately for every package.

### Failure and scheduling

Introduce a typed GitHub failure carrying category (rate-limited/access-denied/not-found/transport/integrity), status, sanitized endpoint, optional retry-after/reset, and auth-present boolean. Existing callers must not swallow rate-limit errors into null. Missing content retains explicitly documented compatibility behavior; HTTP failure never becomes missing verification.

Default: no automatic retry/sleep on confirmed throttling; return actionable timing. This avoids long hidden waits and request storms. A future bounded retry option is separate scope. Share the throttle state across API clients within the operation so queued requests stop; no guarantee of recalling already-sent requests. Preserve safe cancellation and settle owned resources.

Use command-boundary exit handling, not process.exit inside library code. JSON gets a stable versioned failure envelope consistent with existing CLI conventions. Do not send Authorization to release-asset/CDN hosts that are currently unauthenticated.

### Persistent-cache boundary

In scope for a separate delivery PR, after the storage design gate. Default persistence covers public immutable package/tree bytes only; private authenticated content stays session-only. Mutable refs/metadata require revalidation; cached success does not authorize offline installation by default.

Proposed starting bounds (subject to fixture measurement before approval): 256 MiB total, 4,096 records, existing 1 MiB raw-file bound; separately bound tree/manifest decoding and metadata bodies. Evict least-recently-used complete entries; atomic private writes; explicit schema version; reject symlinks, traversal, partial/corrupt records and unknown incompatible versions. Cache is disposable and untrusted. Verify cached package bytes against independently selected source evidence, not a self-authored cache digest alone. Reuse never suppresses fresh release-manifest qualification or moved-tag checks. Document purge/recovery and test concurrent writers/eviction. No negative caching of 403/429/network failures.

Conditional metadata requests reuse exact ETag/request identity; auth-context changes cannot share mutable representations. Do not promise zero API calls on repeat sync. Record observed cold/warm request counts in the release evidence; target immutable downloads rather than a fabricated latency percentage.

### Attribution precedence and consent

Canonical precedence remains package-specific LICENSE/NOTICE, otherwise the root file from the same resolved source. Keep exact bytes, including non-SPDX/custom text and notices. A digest is evidence of content identity, not legal permission or authenticity by itself.

Add explicit per-package attribution origin metadata to the lock/planned installation: source kind (package/root), repository path, requested ref, commit, tree/blob identity, content SHA-256 and verification basis (release-manifest or commit-tree/blob). Root attribution currently lies outside category manifests; extend future manifest generation to bind required root attribution and retain a clearly labeled verified legacy fallback. Do not claim existing manifests already cover it.

Recommend preview/explicit confirmation whenever existing attribution bytes change or disappear, or a legacy install's attribution cannot be qualified. First installation also discloses origin, but has no previous-license transition to accept. Proposed separate consent flag: `--accept-attribution-changes`; ordinary `--yes` accepts version prompts only. Non-interactive runs without separate consent fail preflight. Never infer legal approval from this flag: it authorizes installation, not relicensing. Installed user modifications still follow ownership protections and are not bypassed by attribution consent.

Current old MIT files may have incomplete provenance. Report `legacy-unqualified`; do not invent a previous commit/license grant. Preserve those bytes until the operator approves the resolved plan. Keep parity across shared/native agent destinations and plan source paths, not screenshot text alone.

### Selection and preflight publication

Semver comparison applies only to comparable release refs for the same category. Stable pins do not auto-select prereleases; branches/commits/custom refs remain explicit. Validate registry metadata before offering replacements. Reuse the same rule for skills, workflows and specialists.

Reserved selection keys cannot occupy category positions. Parse legacy indentation rather than interpreting every bare `name:` as a category. Do not guess where a misplaced global exclusion belongs; give a path-specific repair suggestion. Preserve unrelated extension keys and valid custom categories.

Stage accepted configuration in memory. Complete source acquisition, verification, and attribution consent before saving config or publishing managed files/lock. This is preflight failure preservation, not a promise of crash-atomic multi-file commits. Reuse ownership staging; design the minimum publication reorder before coding, especially MCP/hook side effects. No consent/config writes during dry-run.

## 6. Implementation slices and ownership

A single implementer owns each slice's files/tests. Shared interfaces are settled in S0; integration owns later command composition. Exact test filenames should follow existing suites rather than creating parallel conventions.

| Slice | Scope / target components | Req / AC refs | Deliverable | Depends on | Size / confidence |
| --- | --- | --- | --- | --- | --- |
| S0 | Final technical contracts: error union, source context, cache eligibility/bounds, attribution record and consent/publication semantics. Inspect exported references with LSP. | All | Reviewed bounded design, compatibility decisions and worker briefs | Plan approval | M / medium |
| S1 | `GithubService.ts` and its HTTP-boundary tests: typed failures, session single-flight caches, commit-keyed tree reuse, per-source attribution download reuse. | 01-03,05 / 01-06,10-11 | HTTP client changes and cold/shared-commit request-count proof | S0 | M / high |
| S2 | `ConfigService.ts`, `SyncService.checkForUpdates`, `install/RefResolver.ts`, selection tests: reserved-key/legacy parsing and semver update policy. | 09-10 / 18-20 | Validated selection before remote discovery | S0 | M / medium |
| S3 | `SkillSyncService.ts`, `LockfileService.ts`, attribution tests, release manifest generator/verifier: origin records, precedence, exact-byte preservation and legacy qualification. Lock migration design must account for current version-2 consumers rather than blindly adding fields. | 05-06 / 10-14 | Attribution/source contract and compatible read/write behavior | S0 | L / medium |
| S4 | `commands/sync.ts` / `index.ts`, acquisition services and ownership lifecycle: shared throttle propagation, nonzero outcomes, plan preview/consent, preflight publication ordering. | 02-03,07,11 / 03-06,14-16,21 | Integrated command semantics and CLI regressions | S1,S2,S3 | L / medium |
| S5 | GitHub client + bounded cache helper, existing filesystem safety patterns and fault tests: durable public cache and ETag metadata handling. No new storage framework. | 04-05 / 07-11 | Cache implementation, corruption/concurrency/eviction proof and warm-run request receipt | S1,S3 | L / medium |
| S6 | Maintainer licensing assessment, TypeScript category metadata/release manifest, existing release tooling. | 08 / 17 | Approved forward release candidate with qualified notices | S3; MAINT approval | M / low until provenance decision |
| S7 | Integrated built-entrypoint smoke, docs/changelog, scoped independent review, patch release PR. | 12 / 22-23 | PR evidence and operator recovery guide | S4,S5; S6 only for MIT-release claim | M / medium |

Parallel execution after S0: S1, S2, and S3 can run concurrently with disjoint ownership. S4 integrates them. S5 can proceed after S1/S3 while S4 runs only if client/lock shared edits have a designated integration owner. S6 licensing assessment can start immediately, but publication waits for its own authorization. Do not serialize independent research or pad delegation. No worker chooses a different profile/model or spawns agents.

Delivery PRs: A = S1/S2 plus minimal rate-limit command propagation; B = S3/S4 attribution and publication safety; C = S5 persistent cache; D = S6 qualified category release, only when authorized. S7 qualifies each release boundary and then the integrated behavior. Partial PR approval must not be described as all-scope completion.

## 7. Verification and rollout

For each slice: inspect existing coverage, define the consumer-visible fault, capture genuine focused RED where behavior changes, implement, run one final affected gate. Infrastructure/fixture failures are not behavioral RED. No blanket retries, mock echoes, source-string tests, or weakened integrity assertions. Request counts prove network economics at the transport boundary; installed bytes and lock sources prove application results.

Use existing Vitest suites under `cli/src/services/__tests__` / `commands/__tests__`. Candidate checks include `pnpm --filter ./cli exec vitest run <affected suites>`, scoped ESLint/Prettier, `pnpm --filter ./cli build`, and `pnpm --filter ./cli exec tsc --noEmit -p tsconfig.json`. Derive final targets from touched files. Run raw exit-preserving commands, without grep/tail/echo pipelines that mask failures. Record current baseline compiler failures and any new diagnostics separately; do not use this plan to waive CI.

Consumer smoke must launch `cli/dist/index.js` asynchronously against a controlled HTTP fixture/preload, in an isolated HOME/project with replaced credential environment. Actual application services, ownership writes, lock persistence and installed agent outputs remain real. No live quota exhaustion or real workspace sync for testing. Inject primary/secondary limits, ordinary 403, 304, tag changes, cached corruption and attribution changes; assert exit code, config/files/lock bytes and diagnostics. Verify no credential reaches redirected asset hosts. A failure exit alone is not evidence of correct preservation.

Human acceptance: MAINT reviews behavior/consent defaults and licensing decisions. Independent code review cannot supply legal authority, merge approval, release approval or host-enforcement claims. Update auth/rate-limit/cache/attribution troubleshooting docs and changelog per delivered PR. Next CLI version is determined from the actual merged/npm baseline at release time; do not assume 2.7.2 while parallel work may move it. Category releases are separate from CLI releases.

Rollout: merge/publish only through approved release controls; canary in a disposable consumer with the old lock layout and all configured agent destinations. Rollback uses an explicitly selected prior CLI plus preserved project backup; never silently downgrades category refs or deletes attribution notices. Cache purge must not delete installed content or ownership records. Archive verification receipts before removing disposable helpers.

## 8. Decisions and readiness

| Decision | Owner | Affected slice | Required evidence / recommended disposition |
| --- | --- | --- | --- |
| Plan/consent default approval — RESOLVED | MAINT | S0,S4 | Approved in this conversation on 2026-11-04: fail-closed attribution transitions and separate consent flag. S0 design/readiness and execution-routing gates still apply. |
| Intended TypeScript licensing | MAINT | S6 only | Confirm rights and applicable third-party notices; approve a new MIT distribution only if justified. Otherwise preserve Apache for the old release. |
| Persisted contract compatibility | Engineering + independent reviewer | S3,S5 | Review current lock parsers/older consumers, cache trust evidence and bounds before selecting exact schema version/field names. |
| Execution routing | Orchestrator + MAINT where exception needed | Worker dispatch | Reuse authorized eligible profiles explicitly; user must approve role/model exceptions and higher-cost routes. No implied native scout permission. |

Status: implementation authorized and in progress; corrected S0 design approved independently. Apply the approved scope amendment above: S5 is deferred, not implemented or qualified. S1/S2/S3 corrective and S4/S7 integration/review gates remain open; S6 remains blocked on licensing authority. No release approval or completed-delivery claim.
