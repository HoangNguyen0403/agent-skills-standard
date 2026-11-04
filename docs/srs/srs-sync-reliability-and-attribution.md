# S0 Technical Contracts: Sync Reliability and Attribution

Status: S0 DESIGN APPROVED by Hoang Nguyen on 2026-11-04 in this conversation; implementation authorized subject to the named per-slice readiness/review gates. No code qualification or release approval is claimed.

Authority: `docs/prd/prd-sync-reliability-and-attribution.md`, approved by Hoang Nguyen in this conversation on 2026-11-04; subsequent instruction: `start implement the plan`. Delivery mode extended. The approved PRD is the only requirements/AC source; IDs below map implementation boundaries, not duplicate requirements.

**Approved scope amendment:** Hoang Nguyen selected `persistent_cache_scope: Defer persistent cache` in this conversation. HLD-05 / S5 and REQ-004 / AC-007–009 are deferred from this change, including persisted metadata/conditional-request obligations. Their original design remains below for traceability only; no native component, disk-cache client integration, or cache-specific proof fetch is authorized by the active scope. Retain HLD-01 session reuse, source/manifest integrity, HLD-02 selection, HLD-03 attribution, and HLD-04 preflight/consent contracts unchanged. S7 qualifies the retained scope; MAINT-only S6 remains separately gated. No safety contract is weakened or deferred-cache support claimed.

## Decision brief

Use the existing GitHub client, release verifier, ownership writer and version-2 lock. Add focused records/helpers rather than a replacement installer. Build one source context per selected final ref, share immutable requests by commit, and preflight every acquisition and attribution decision before managed publication. Keep the merged manifest refresh until the final-plan path proves equivalent behavior.

Compatibility decision: optional versioned `attributionCatalog` inside the existing outer version-2 lock, whose parser already preserves unknown top-level fields. New writers validate/preserve it, merging unaffected packages; old writers may discard it, in which case the next new sync requalifies from installed bytes rather than inventing provenance. Do not force a version-3 lock or treat missing provenance as MIT. This is backward-readable, not a promise that older CLIs implement consent semantics.

Cache decision: persist only explicitly qualified public source content; repository visibility unknown/private means session-only. Avoid extra visibility API requests solely to enable cache: unknown defaults session-only. Known GitHub public registry qualification may use existing repository-info response with public visibility; add fields there, not a host-name assumption. Cache cannot bypass ref/manifest revalidation. One shared client is operation-scoped; reset per-operation limiter/caches if reused across commands.

Remaining human gates: approve these contracts and select a permitted separate review route. TypeScript licensing/release remains excluded until MAINT supplies rights/notice assessment and release authorization.

## HLD-01 / CMP-HTTP: request and failure boundary

Maps REQ-001..005; AC-001..011. Owner S1: `GithubService.ts` plus new `services/github/GithubRequestError.ts` and HTTP tests. S5 extends the same boundary only after S1 settles.

Export `GithubRequestError extends Error` with readonly `kind: 'rate-limited' | 'access-denied' | 'not-found' | 'transport' | 'integrity'`, numeric HTTP status when present, sanitized endpoint (no credentials/query secrets), `authenticated: boolean`, `retryAfterSeconds?: number`, `resetAt?: string` (ISO), and `rateLimitKind?: 'primary' | 'secondary'`. Error cause stays internal; printable/JSON projections use a safe allowlist. Existing IntegrityError remains available; do not create a compatibility alias or remove callers without migrating them.

Classifier rules: remaining=0 on 403/429 is primary exhaustion; retry-after or validated GitHub secondary/rate-limit response evidence is secondary; 429 is throttling even when headers are absent; ordinary 403 remains access-denied. Malformed timing headers must not produce NaN/negative/infinite delays. Default no sleeps or automatic retries. Successful 404-as-absence behavior remains only where currently intentional. Existing catch-to-null paths must rethrow typed rate-limit/access errors; explicitly preserve absence contracts for true missing objects. First rate-limit error latches the operation. Queued acquisition checks the latch; requests already in flight are allowed to settle, with no publication after failure. Do not introduce broad promise rejection leaks.

Session single-flight key: repository identity, method/URL, Accept representation and client auth scope. Never log or persist auth key material. Resolve-ref cache entries are invocation-only; tree/body caches are keyed by resolved commit/blob. Evict failed promises. Share root attribution downloads once per commit. Do not reuse one category tree for another commit. Release assets/CDN requests remain unauthenticated as today; never attach API tokens across hosts.

Keep public method signatures where feasible; additions are narrow optional parameters/helpers. S1 must publish exact API notes to S4/S5 in its report. Exported changes require LSP references before edits.

## HLD-02 / CMP-SELECTION: config and version policy

Maps REQ-009..010; AC-018..020. Owner S2: `ConfigService.ts`, new `services/install/UpdatePolicy.ts`, focused config/update tests. Integration owner applies UpdatePolicy to `SyncService.checkForUpdates`; S2 must not edit SyncService concurrently with S3/S4.

UpdatePolicy API: `isAutomaticUpgrade(currentRef: string | undefined, candidateRef: string, tagPrefix: string): boolean`. Accept only canonical comparable stable semver refs for the same configured prefix and strictly greater numeric major/minor/patch. Undefined initial pins may be handled by the existing initial-pin path, not mislabeled upgrades. Prereleases/custom refs/branches/commit pins are preserved. Use an existing suitable semver dependency if present; do not add a new dependency for a three-component comparison without review. Return false for malformed/incomparable refs. S2 supplies tests covering workflow/specialist reuse; S4 applies the same policy in all three candidate paths.

Config validation happens before registry I/O. Reject `include`, `exclude`, `ref` in category position with path and correction guidance; do not ban valid custom category names. Preserve extension keys within actual category records. Legacy indentation drives block include/exclude parsing; inline lists follow the same membership rules. Malformed ambiguous legacy inputs fail without rewriting files. Do not silently migrate a global exclusion to an arbitrary category.

## HLD-03 / CMP-ATTRIBUTION: provenance data

Maps REQ-005..008; AC-010..017. Owner S3: `SkillSyncService.ts`, `LockfileService.ts`, `services/AttributionService.ts` and relevant data models/tests; limited SyncService persistence glue after S1/S2 are settled. S4 owns command consent/publication.

Collected package attribution records carry physical package ID, source kind (`package`/`root`), bounded repository path, declaring source requested ref, resolved commit, blob SHA-1, SHA-256, verification basis (`release-manifest`/`commit-tree-blob`), and installed relative filename. Blob SHA-1 is Git blob identity, not a truncated SHA-256. Use actual downloaded bytes and tree blob values. Root LICENSE/NOTICE stays from the same source as the package; package-local LICENSE variants override root LICENSE variants as one family, and NOTICE variants are a separate family. Never normalize/rewrite license text or infer SPDX identity as authority. Any release manifest used for selected-source verification must have `manifest.commit === resolvedCommit`; a syntactically valid but different commit is an integrity failure.

Lock `attributionCatalog`: `{version: 1, packages: Record<string, {registry: string, requestedRef: string, resolvedCommit: string, files: AttributionFile[]}>}`; each AttributionFile contains the source fields above and per-agent installed path/digest bindings if adapter mapping changes destinations. Reuse existing path/digest validators. Unknown catalog version or invalid qualified record fails closed before republishing; missing catalog is valid legacy state and must not invent origin. Preserve unselected records and validate actual installed bytes before using prior metadata in a change comparison.

AttributionService provides a pure comparison/planning boundary, not writes: package additions/removals/changed files, old/new digest and provenance/qualification state. New empty installs disclose source without transition consent. The consent predicate is addition/change/removal of attribution on an existing installation, OR any existing attribution that remains `legacy-unqualified` because trustworthy historical origin is absent. Identical old/new bytes alone do not qualify that origin and never suppress this consent requirement. Declining preserves config, installed managed files and lock bytes. Modified installed files still follow ownership protection, never overridden by this consent.

Future release manifests include required root LICENSE/NOTICE outside the category subtree when used. S3 owns `scripts/release/manifest.ts` and its tests for this additive publication contract, preserving schema-1 compatibility and other release scopes. For existing release manifests, absent root entry may use separately reported verified commit-tree/blob basis; an existing conflicting root manifest entry must fail. Keep direct content tamper refusal.

## HLD-04 / CMP-COMMAND: preflight and publication

Maps REQ-002,03,07,11,12; AC-003..006,14..16,21..23. Owner S4: `commands/sync.ts`, `index.ts`, `SyncService.ts` (exclusive integration ownership after S3 settles), acquisition APIs where necessary, command tests.

Flow: read/validate -> reconcile in memory -> obtain metadata/select final refs -> resolve final source identities/verifiers -> acquire skills/workflows/specialists -> validate complete acquisition and attribution plan -> show/obtain separate attribution consent -> begin/publish using existing ownership writer -> save accepted configuration/lock -> success -> existing separately consented post-success MCP/hooks.

Do not save reconciliation/pin/version changes before preflight. Local parser normalization must not write automatically before this gate. Acquire specialists before writeSkills/writeWorkflows; separate existing acquisition/publication if needed rather than special-casing failures. Incomplete workflows/specialists abort this sync publication contract, not falsely successful partial sync. Stage attribution plan from downloaded candidates and existing lock/files. Cache writes are disposable, outside managed state, and cannot publish installation authority.

Proposed SyncOptions addition: `acceptAttributionChanges?: boolean`, Commander `--accept-attribution-changes`. Ordinary `--yes` is not attribution acceptance. TTY confirmation defaults false; non-interactive without separate flag fails. Consent is only to the computed in-memory plan; do not refetch or mutate source bytes afterward. If revalidation changes plan, discard consent/requalify. User selects exact plan rather than persisting a blanket consent preference.

Command result: `run` returns a narrow discriminated outcome (success/dry-run/cancelled/failure) or throws a typed command failure, chosen by integration owner to preserve existing command conventions after references inspection. At CLI boundary set exitCode=1 for failure/cancelled-with-unapplied-required-change; never process.exit within services. `--json` normal execution emits one versioned `sync.result`/`sync.error` envelope using existing schema style; send progress/diagnostics to stderr rather than contaminating stdout, including dotenv startup output where necessary. Preserve existing dry-run `sync.plan` envelope and no writes.

This guarantees byte preservation for preflight failures, not crash-atomic multi-file publication. Do not claim installation succeeds from exit0 alone; smoke verifies installed content and lock.

## HLD-05 / CMP-CACHE: durable cache

Maps REQ-004,05; AC-007..011. Owner S5: `services/github/VerifiedPublicCache.ts` and GitHub client integration after S1. No lock/command edits without integration ownership transfer.

Schema-1 private user cache under platform user cache root (reuse installed project convention if one exists; otherwise explicit XDG_CACHE_HOME or HOME/.cache/agent-skills-standard/github). 256 MiB/4096 complete records; file content stays within existing 1 MiB file bound. Proposed decode caps: trees16MiB, manifests4MiB, metadata4MiB; reject truncation/incomplete trees. Cap applies to actual bytes, not stat alone. Never follow symlink cache roots/records, accept traversal names, or execute cached content.

Persist immutable public tree/blob bodies with repository+commit+representation key, content digest and bounded validation metadata. A blob cache hit requires an authoritative expected manifest digest or Git blob identity obtained from qualified fresh source evidence. Tree cache eligibility requires a fresh HTTPS commit-object response binding the resolved commit to its root tree SHA, followed by independent reconstruction of the complete cached Git tree objects: validate modes/types/path uniqueness and parent membership, reconstruct nested tree byte order/entries, recompute every subtree/root Git SHA-1, and match the authoritative root. Reject truncated, unsupported, ambiguous or incomplete trees. Without that proof, use a fresh network tree; never accept the cache's self-reported `sha` or recomputed JSON digest as membership evidence. Cache verification cannot widen legacy no-manifest trust. A matching release manifest additionally requires `manifest.commit === resolvedCommit`.
Mutable metadata uses ETag/request/auth identity with conditional revalidation only when the prior body is independently qualified. A validated current-invocation in-memory body is eligible for subsequent304 reuse. An untrusted disk body plus a server304 is NOT independently authenticated: do not reuse persisted revocation/selection metadata on that basis. Without an independent body binding, fetch fresh200 metadata, preserving current revocation checks. Auth changes cannot share representations.304 without a usable qualified body permits one unconditional refetch if not throttled. No negative caching for HTTP failures; private/unknown visibility stays session-only.

Atomic uniquely created private temp file + rename, cleanup on errors, bounded cache scan and LRU eviction of complete entries. Cross-process writers must be safe for identical immutable entries; corruption/replacement is detected at read. No lock-based indefinite waits. Unknown cache schemas discard/refetch rather than migrate into trusted evidence. Purge only owned cache records, never project files/lock. If safe cache access fails, fallback to verified network when permitted; rate-limit latch still applies. Default private/unknown visibility remains session-only.

## Verification / VER-01

Canonical ACs stay in PRD. S1 owns HTTP-boundary request-count and failure classifier fixtures. S2 owns parsing/update policy behavioral tests. S3 owns provenance byte/hash/path/legacy tests. S4 owns full preflight byte preservation and consent/exit/JSON scenarios. S5 owns cache fault/concurrency/eviction tests. S7 creates a disposable asynchronous built-CLI HTTP/preload fixture using isolated HOME/config and real application services; no live quota exhaustion, no real workspace sync. Existing whole-project type errors are recorded, not rerun to reconfirm or hidden.

Execution contract: workers skip build/lint/full suites/formatters mid-flight. Focused initial RED and final GREEN are allowed sequentially within owned files, with no peer mutation in a shared test process. Finish and freeze slices before covering integrated checks. Preserve RED infrastructure failures separately. Required independent review is separate from implementation ownership. Plan IDs map HLD-01=S1; HLD-02=S2; HLD-03=S3; HLD-04=S4; HLD-05=S5; S6 licensing is MAINT-only and blocked; S7 integrates all engineering ACs.

## Requirement Trace

Scope comes from the filename slug `sync-reliability-and-attribution`. Each PRD requirement maps to the acceptance criteria that verify it and to the design section and slice that own it. No BRD objective exists for this slice, so no BRD edge is claimed.

| Design / slice | PRD REQ reference | AC references | Owner / verification |
| --- | --- | --- | --- |
| HLD-01; S1 | REQ-001 | AC-001, AC-002 | S1 request-count fixtures; integration |
| HLD-01, HLD-04; S1, S4 | REQ-002 | AC-003, AC-004 | S1 classifier fixtures; S4 command outcomes; integration |
| HLD-04; S4 | REQ-003 | AC-005, AC-006 | S4 exit/JSON/auth-guidance scenarios; CLI smoke |
| HLD-05; S5 | REQ-004 | AC-007, AC-008, AC-009 | Deferred by the approved scope amendment; not delivered or verified here |
| HLD-01, HLD-03; S1, S3 | REQ-005 | AC-010, AC-011 | S1 commit-keyed reuse; S3 manifest/commit binding; integration |
| HLD-03; S3 | REQ-006 | AC-012, AC-013 | S3 provenance byte/hash/path tests; integration |
| HLD-03, HLD-04; S3, S4 | REQ-007 | AC-014, AC-015, AC-016 | S3 comparison predicate; S4 preview and consent; CLI smoke |
| S6 | REQ-008 | AC-017 | Maintainer licensing authority; blocked, no release approval claimed |
| HLD-02; S2 | REQ-009 | AC-018 | S2 update-policy tests; integration |
| HLD-02; S2 | REQ-010 | AC-019, AC-020 | S2 selection parsing and validation tests; integration |
| HLD-04; S4 | REQ-011 | AC-015, AC-021 | S4 preflight byte-preservation scenarios; CLI smoke |
| S7 | REQ-012 | AC-022, AC-023 | Built-entrypoint smoke and review receipts; release review |

## ADR-01: snapshot-correct sync with explicit transition consent

Choose additive provenance and commit-bound reuse instead of changing historical license bytes or replacing the installer. Cache remains untrusted and disposable. Preflight failures preserve managed state. Consequence: legacy provenance requires qualification; older CLI versions can drop new provenance and therefore cannot enforce new consent semantics. No compatibility shim can confer those semantics on older binaries. Consequence: shared-file integration is sequenced after disjoint work, not edited by multiple owners.

## Readiness

PARTIAL candidate: S1/S2 can start once these contracts and execution route are approved. S3/S4/S5 require reviewed storage/consent contracts as recorded here, not fresh product discovery. S6 requires separate licensing assessment/release authority. No implementation, tests, release, or legal acceptance claimed by this document.
