# Task 2 — Text provenance and evidence wording

Status: `IMPLEMENTED_PENDING_VERIFICATION`. Production changes are complete; no tests, build, lint, or formatter were run by this worker.

## Scope and changes

- `scripts/evals/execute.ts`: refuses answer generation for composite evidence before worker configuration, runner construction/invocation, answer writes, or metadata writes. Updated worker instruction to clarify that prompt instructions/read-only filesystem capability do not establish host-enforced tool restrictions or tool-free execution. Replaced `Promise.withResolvers` in `codexRunner` with ordinary `new Promise` construction for the supported Node 20 runtime.
- `scripts/evals/reporter.ts`: category/group classification now retains known protocol versions and unresolved contributor counts independently; aggregate heterogeneity survives partial provenance, with a structured unresolved-count field. Physical-history presentation resolves from the full physical run when available, without mutating stored history or evidence. Tool-use evidence remains qualified as unverified.
- `scripts/evals/impact.ts`: imports `EvidenceMode` as a type.
- `scripts/evals/evals-v2.test.ts`: regression-only tests and removal of old wording assertions preserved.
- Historical transcripts/results and other historical evidence were not modified.

## Test Intent Records

### Composite recovery with missing historical lane

- **Contract:** Composite evidence is immutable. If a historical leaf lane is absent, answer execution rejects before runner invocation and does not recreate the answer or mutate the composite manifest/results; leaf provenance remains historical.
- **Fault:** Top-level v4 composite protocol passes the generation gate and regenerates a missing historical v1 transcript, retaining the old provenance label.
- **Layer:** Unit/integration boundary at `executeMissingAnswers` with a real temporary composite created via `composeRuns`.
- **Cases:** Mixed-protocol composite whose historical base lane is deleted after composition; injected runner call count and persisted files are observed.
- **Exact smallest command:** `rtk node --import tsx --test --test-name-pattern='composite recovery refuses to regenerate a missing historical lane' scripts/evals/evals-v2.test.ts`

### Known plus unknown provenance contributors

- **Contract:** Unknown contributors participate in provenance classification; a known v4 plus unknown report does not certify a known-only v4 headline and discloses unresolved provenance.
- **Fault:** Reporter filters unknown contributors from protocol summary, yielding a v4-only headline without an uncertainty notice.
- **Layer:** Pure report behavior using `buildEvalsReportMarkdown` with independently classified category results.
- **Cases:** Known neutral-skill-v4 category plus alternate-root/unresolved category.
- **Exact smallest command:** `rtk node --import tsx --test --test-name-pattern='report keeps unknown provenance contributors in the summary' scripts/evals/evals-v2.test.ts`

## RED evidence

The orchestrator reported this exact command:

`rtk node --import tsx --test --test-name-pattern='composite recovery refuses|report keeps unknown provenance' scripts/evals/evals-v2.test.ts`

Observed result: exit 1; two failures. The composite recovery did not reject, and the known-v4 plus unknown contributor produced a v4-only headline.

## Additional observed pipeline compatibility

The orchestrator reported that CI targets Node 20 with package engines `>=20`, and observed:

`rtk pnpm dlx node@20 -p 'typeof Promise.withResolvers'`

Output: Node `20.20.2` returned `undefined`. `codexRunner` now uses the standard `Promise` constructor; no polyfill, engine-floor change, or model-default change was made. The actual Node 20 eval lane remains pending parent verification.

## Evidence and limits

- Finding basis: `artifacts/security-review.md` F7, F8, N1, NV1.
- Regression intent and exact focused commands are recorded above. Parent's RED run is the available pre-fix evidence; no post-fix verification was run here.
- Unknown provenance is uncertainty, not proof of heterogeneous protocols. Mixed is reported only when multiple known protocols establish heterogeneity.
- Tool-use prohibition is prompt-level, read-only filesystem capability is not proof of no tool use, and tool-use events are not retained here. Tool-free execution remains unverified; no host controls or historical certification were added.

## Follow-up regression adjustment

The parent-reported full `scripts/evals/evals-v2.test.ts` target completed with 46 passing and 1 failing test. The failure was only the `/unknown provenance/i` prose assertion: the report says “unknown protocol provenance” while correctly showing the unknown summary and category protocol. Removed that incidental wording assertion; retained assertions for the unknown protocol headline and unresolved category row. No production wording change or replacement wording assertion was made. No checks were run for this adjustment; the parent will rerun the amended focused target and then the full suite.

## R1/R2 regression phase

Parent observed all three new regressions RED before reporter changes: 3/3 failed in 0.35s. Failures matched the intended gaps: missing structured unresolved-count row; cross-category known v1/v4 union reduced to `unknown`; stale physical-history v4 label not qualified by the full partial-provenance run.

The three consumer behaviors are covered by:

- `report preserves mixed and unresolved provenance within one group`
- `report unions known protocols across categories and retains unresolved contributors`
- `physical history uses complete-run provenance, not the selected category projection`

The implementation keeps known protocol versions and unresolved counts as separate internal facts. The report exposes the count as structured table data; no exported API was introduced. The history display uses complete physical-run provenance and leaves supplied history/results objects unchanged.

No checks were run by this worker after these edits. Parent verification evidence and the bounded compiler corrections are recorded below.

## Parent Node 20 and strict compiler follow-up

Parent reported the full Node 20 eval lane passing: 108/108 in 9.32s. A subsequent strict compiler run with NodeNext/ES2022 settings reported three reachable typing issues; the authorized bounded corrections were:

- `execute.ts`: narrow the optional `baselineRunId` access to `ManifestV2` using `schemaVersion === 2`.
- `reporter.ts`: type the existing evidence-mode helper as `EvidenceMode | "unknown"` so `"regraded"` is preserved.
- `manifest.ts`: annotate the existing empty `compromisedSkills` array as `ManifestV2["compromisedSkills"]`; no manifest behavior changed.

No checks were run after these typing corrections. Parent will repeat the scoped compiler check and packaging verification.

## H2 provenance regressions — Phase A

Added test-only coverage for the unresolved-leaf provenance review finding:

- Composition rejects a partial composite when its selected base leaf has no provenance entry; asserts no output directory and unchanged digests for every source run.
- Composition rejects a provenance-map-free run explicitly marked composite; setup verifies the run remains accepted by `verifyRun`.
- Public `planBaseline` keeps assertion-only changes on a complete physical v4 run reusable for regrading and activation evidence.
- Public `planBaseline` requires generation for assertion-only changes when the selected composite leaf has no provenance entry, including `reuseBaselineOutcome: false`.
- Public `planBaseline` rejects v4 fallback for a provenance-map-free run marked composite, if accepted by the existing complete-run read path.

Scope: tests and this report only. No production code changed. No commands or tests were run in Phase A; RED evidence remains pending the orchestrator's authorized test run.

## H2 Phase A selector correction

Parent's first Phase A run observed two valid composition regressions reaching the expected missing-provenance exception point after `verifyRun` accepted their fixtures. The three planning tests did not test their intended outcomes: they searched for a nonexistent `skillPath` field on public impacts, so each lookup returned `undefined`. Do not interpret those three results as product regressions; the physical-run control also did not exercise its intended compatibility assertion.

Corrected all three planning selectors to the public `key === "dart/dart-tooling"` field and added explicit impact-existence assertions before outcome/activation checks. Test-only change; no checks were run after the correction. Parent must rerun the focused Phase A tests before any production-source authorization.

## H2 Phase A corrected RED and authorized source fix

Parent's corrected Phase A run reported four valid failures and one passing control: both composer cases accepted complete verified fixtures but did not reject missing selected-leaf provenance; both unresolved-composite planning cases reported `regrade` where `generate` was required; the complete physical v4/no-map control passed.

Implemented the authorized narrow source fix:

- `compose.ts` now resolves selected source runs before output-directory creation and refuses a missing protocol for a selected leaf when a provenance map is present, or when a map-free run is marked composite by `evidenceMode` or legacy `agent` text. Only selected sources are checked, so a known overlay leaf may replace an unresolved base leaf. Physical map-free runs retain their top-level protocol fallback.
- `impact.ts` uses a private per-skill protocol resolver at all three prior top-level fallbacks: compatible outcome evidence, compatible activation evidence, and baseline protocol comparison. Missing composite/map provenance is unresolved, not current; physical map-free runs retain top-level fallback.
- Updated the compatibility comment: the overlay supplies the composite manifest's top-level protocol while per-skill provenance retains source labels.

No public exports, provenance labels, schema changes, or history writes. No tests, build, lint, format, or smoke command was run after source changes. Parent verification remains pending.

## Parent verification and scoped scorer narrowing

Parent reported the Node 20 text lane green: 54/54, 2.75s, zero failures/skips; composition and reuse corrections worked. Expanded strict TypeScript reported `TS2345` at the existing `scorer.ts` input-integrity call because the compound `schemaVersion === 2 && !inputs` branch did not narrow `inputs` in the `else if`. The previous compiler scope did not include this path; this is not attributed to H2.

The authorized `scorer.ts` change only restructures that existing branch: an outer v2 guard, then the same missing-input throw/snapshot-write path, else integrity verification with narrowed non-null inputs. The `scoreRun` public signature and runtime behavior are unchanged.

Parent also reported the initial CLI smoke stopped before app behavior because its scratch skills directory was absent (`ENOENT`); the helper's `outputJson` was corrected. No product failure was observed from that attempt.

No tests, build, lint, format, or smoke command was run after the scorer narrowing. Parent's repeat expanded strict compile, actual CLI smoke, and review are pending.
