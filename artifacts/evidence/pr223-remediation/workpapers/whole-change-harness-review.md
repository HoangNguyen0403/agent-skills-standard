# PR223 cumulative harness/text review — independent worker

## Loaded skills and review authority

MCP compliance audit, performed before this report, confirms:
- `common/common-best-practices`
- `common/common-code-review`
- `common/common-llm-security`
- `common/common-owasp`
- `common/common-security-audit`
- `common/common-tdd`
- `javascript/javascript-language`
- `nextjs/nextjs-testing`
- `typescript/typescript-language`

Also read `AGENTS.md` first, the MCP `code-review` workflow, local `code-review`, `verification-before-completion`, and `using-superpowers` (its dispatched-worker exception applies), `docs/review-policy.md`, the trust-review policy, and the TDD quality contract. The Next.js match and audit's Angular/NestJS/React coverage warnings are extension-routing artifacts: these are Node scripts, not framework components. No framework conversion is requested. `xd://lsp` status returned **No language servers configured for this project**; source/callsite review used bounded reads and searches.

Assigned profile: **Personal · Analysis & Review**, `omp/openai-codex/gpt-6.1-sol`, high/write, no premium. No delegation or profile changes.

## Standalone verdicts

- **SPEC: CHANGES REQUESTED.** Original F2–F7/N1/NV1/NV2 corrective paths conform to the inspected contracts. F8's reporter correction conforms, including independent uncertainty/heterogeneity and full-physical-history presentation. Two additional cumulative-scope gaps remain: the new pagination oracle accepts a plausible non-integer-page implementation, and the neutral-protocol composition/reuse path can turn an unresolved selected leaf into known v4 provenance.
- **QUALITY: CHANGES REQUESTED.** Two **Major** static findings below; no Blocker or Nit. Both have concrete consumer paths. Runtime manifestations of these new counterexamples were **not executed** by this reviewer and are identified as inference, not observed smoke results.
- These verdicts are for the owned harness/text/fixture/documentation slice of the cumulative package. They are **not maintainer approval, merge approval, publication authorization, or current-head Actions approval**.

## Confirmed findings

### H1 — [MAJOR] Pagination verifier never exercises the positive non-integer page contract

**File/line:** `benchmarks/tasks/verifiers/verify-pagination.js:145–157`; contract at `benchmarks/tasks/guidance/pagination.minimal.md:10` and `pagination.current.md:13`; passing candidate at `scripts/evals/task-runner.test.ts:291–325`.

**Contract:** Non-positive **or non-integer** page values normalize to page 1. This is part of the new task, not unrelated baseline debt or an additional product requirement.

**Confirmed source fault:** The check named “non-positive or non-integer page normalized to 1” calls only `page: 0`, `page: -10`, and `page: NaN`. Across the entire verifier, every positive supplied page is an integer. None exercises a finite positive fraction.

**Reachable path:** Use the existing passing test implementation, changing only its page predicate from `Number.isInteger(options.page)` to `Number.isFinite(options.page)`, retaining `options.page > 0` and the same fallback. For every page value supplied by the verifier, both predicates make the same decision; all other implementation behavior is unchanged. Ordinary worker execution writes this implementation, the unchanged trusted verifier runs all eight cases, and it emits a complete all-passed receipt. Receipt validation at `task-runner.ts:420–492` and success classification at `1093–1101` cannot detect the missing product probe.

**Why:** **[INFERENCE, not executed]** This faulty implementation is certified successful, yet `paginate([1,2,3,4,5,6,7,8,9,10,11,12], { page: 1.5, pageSize: 10 })` returns page `1.5` and slices from offset `5`, rather than normalizing to page `1` and returning the first ten items. This is a concrete false-positive benchmark outcome, not a production service vulnerability. Complete receipts prove the reported checks completed; they do not make an incomplete oracle complete.

**Check / existing coverage:** Reviewed the full verifier and harness test file. The only `1.5` in the harness tests is a **worker timeout validation** input, not pagination. The passing pagination implementation uses the correct integer predicate, and the other pagination-related harness cases exercise early exit, tampering, timeout, setup, or infrastructure behavior. None invokes the fractional consumer path or asks the real oracle to reject this mutant. Root test counts and the deterministic CLI smoke therefore do not resolve this gap.

**Fix:** Extend the existing normalization check with a finite positive fractional page; assert both normalized metadata and the expected first-page data. Add one real-worker/oracle regression using the finite-only predicate above and require a valid failed receipt/product failure, while retaining the compliant baseline. Do not change the deliberately faulty starting fixture or weaken the guidance.

**Confidence:** **99/100** for the static oracle gap and equivalence on its existing inputs; runtime false-pass result remains unobserved here.

### H2 — [MAJOR] Composition/reuse fills unresolved leaf provenance from a composite's top-level v4 label

**File/line:** `scripts/evals/compose.ts:274–291,312–330`; related neutral-evidence decisions at `scripts/evals/impact.ts:213–216,243–247,274–277`.

**Contract:** Historical/composite evidence retains per-source provenance; unknown contributors are uncertainty, not known-only neutral evidence. An incomplete provenance map must not be repaired by guessing its missing leaf from the composite envelope. See original plan AC-4/decision 3 and remediation contract rulings 4/8.

**Confirmed source fault:** `composeRuns` correctly preserves an existing leaf, but `sourceProvenance?.protocol ?? source.manifest.protocol` treats two different conditions identically: a simple physical run with no leaf map, and a composite with a present map missing the selected leaf. It creates a new complete provenance entry in both cases. It then derives the new homogeneous metadata from those filled entries. The three changed `impact.ts` protocol lookups make the same missing-leaf fallback when deciding whether evidence is current and reusable.

**Reachable accepted input:** A complete, self-contained v2 composite with top-level `neutral-skill-v4`, present but partial `provenance`, and matching partial provenance in `results.json`; immutable source hashes and transcripts are otherwise intact. Select a key omitted from that map from the base, with a valid current overlay for another key. Such partial provenance is expressly supported by the reporter's new input cases (`evals-v2.test.ts:878–903,931–1097`), and the composition source gate does not prohibit it:
- `loadManifest` is a read/cast, not provenance validation (`manifest.ts:470–475`).
- `assertV2Source` accepts composite evidence and checks snapshot/transcript completeness, uniqueness, version and integrity, but does not require complete selected-leaf provenance (`compose.ts:94–155`).
- Snapshot integrity binds source bytes/hashes, not generation provenance (`snapshot.ts:233–258`).
- Re-scoring copies the same provenance into results (`scorer.ts:624–626`), so matching partial records are not rejected merely for this shape by `verifyRun`.

**Why:** **[INFERENCE, not executed]** Before recomposition, the missing leaf is correctly `unknown` in `reporter.ts:313–320`. After recomposition, its emitted provenance is `neutral-skill-v4`; if the other selected leaves are v4, the new manifest declares `protocolProvenance: neutral-skill-v4` and `isHomogeneousProtocol: true`, and the report no longer discloses that contributor's uncertainty. This also allows `planBaseline` to decide “generation protocol unchanged” for an unresolved leaf, and compatible-evidence lookup to reuse it under v4. No deliberately hostile candidate, transient hash race, paid call, or score alteration is needed: the problem is conflating a missing composite leaf with a valid physical-run protocol fallback.

**Diff attribution:** The original-base package adds leaf-aware composition and explicit homogeneous protocol certification, plus leaf-aware v4 reuse checks. This is an incomplete new neutral-protocol contract, not an allegation that the latest Task 2 correction introduced it. The prior baseline already had top-level-only composition; that does not satisfy the newly required provenance-preservation behavior. No committed historical run is alleged to contain this input shape, and no source record was changed in this review.

**Check / existing coverage:** The staged-composite case (`evals-v2.test.ts:480–507`) supplies complete generated provenance. The mixed-history case supplies complete selected leaf records. Partial-provenance regressions test rendering only; they never compose or plan reuse from the partial physical source. Neither those tests nor supplied text smoke establishes this transition's safety.

**Fix:** For a source with a present provenance map, do not synthesize a missing selected leaf from its top-level protocol. The boring existing-schema solution is to refuse that composition in preflight, before output creation/copies; retain top-level fallback for simple physical runs with no leaf map. Apply the same distinction to the three reuse/planning lookups: unresolved leaves are not proved-current reusable evidence. Add one complete partial-composite scenario covering refusal without new output and one reuse-planning assertion; preserve source evidence bytes and valid complete-map historical composition.

**Confidence:** **96/100** for the static missing-leaf-to-known transition. Acceptance of the constructed matching partial source and its resulting report/reuse behavior have not been runtime-smoked here.

## Original finding closure table

“Closed” below means independently inspected source plus explicitly attributed parent evidence, not a reviewer-run command or general correctness certification.

| Original ID | Current assessment | Source / evidence |
| --- | --- | --- |
| F2 — premature verifier exit | **Closed for original path** | Both built-ins capture setup errors and emit receipts only after their synchronous check loops. Runner `420–492,1008–1022,1093–1101` rejects missing/malformed/incomplete/duplicate/count/exit inconsistent evidence. Candidate `process.exit(0)` cannot satisfy receipt acceptance. Parent final CLI early-exit mode: 0 evaluated, 3 infrastructure failures. H1 is a distinct oracle-completeness defect, not reopening exit-only acceptance. |
| F3 — normal-close owned descendants | **Closed for inspected owned POSIX path** | Runner `637–724` awaits group settlement before resolution; TERM + 1.5-second wait + KILL + bounded 5-second observation. Inspection/signaling uncertainty remains infrastructure failure. Worker failure blocks verifier at `958–990`. Real ignored-stdio normal-close regression `task-runner.test.ts:226–279`; parent suite proof supplied. Windows and detached limits remain explicit. |
| F4 — `__proto__` loss | **Closed** | Accepted ID remains valid; `Object.create(null)` at runner `1299` preserves own-key updates, enumeration, `Object.values`, persisted JSON and CLI `Object.entries`. Regression `1228–1259` asserts returned and serialized evidence across all three arms. |
| F5 — tenant spoofing guidance mismatch | **Closed** | All three authorization arms force authenticated tenant override and forbid rejecting just the spoofing field. Oracle `143–175` requires successful creation with forced tenant in both returned and stored state. |
| F6 — foreign-ID destructive create | **Closed, including corrective edge** | Oracle `177–209` rejects collision and compares the entire public-API foreign document to a detached `structuredClone` snapshot; aliasing cannot mutate the expected snapshot. Secure baseline plus overwrite and mutation-before-rejection regressions use real service execution. Parent RED/GREEN recorded in bounded Task 1 review. |
| F7 — composite regeneration | **Closed** | Executor `217–234` rejects composite mode/legacy composite agent marker before config/runner construction, job assembly, writes or metadata mutation, even when the envelope is v4. Historical top-level generation is independently refused. CLI scoring/reporting follows successful executor completion; `scoreRun` rejects missing answers before writes. Parent temporary recovery smoke: no calls/writes. H2 concerns composition/reuse classification, not regeneration. |
| F8 — unresolved headline omission | **Original reporter path closed; end-to-end provenance gap H2 remains** | Reporter retains known versions, unresolved counts, and known heterogeneity independently (`270–374,453–475`); notices have independent guards (`518–528`). Group/cross-category cases preserve mixed plus uncertainty. Full physical `allResults`, not latest category projections, qualify historical display (`531–554`). Composition can still erase uncertainty before reporting, as H2 details. |
| N1 — missing EvidenceMode import | **Closed** | `impact.ts:16–21` uses existing type-only import; evidence-mode classification preserves `fresh`/`regraded`/`incremental`. Supplied affected strict compiler result is attributed to parent, not a root-wide compiler run here. |
| NV1 — unverified tool-free execution | **Closed by truthful qualification, not enforcement** | `execute.ts:141`, `reporter.ts:403`, `docs/EVALS.md` and `CONTRIBUTING.md` distinguish prompting/read-only capability from tool-free proof. JSONL is used for usage, not a retained tool-use audit. No actual absence of tool use is certified. |
| NV2 — restricted viewer listing | **Closed, including privileged completeness** | Oracle `234–267` checks exact own-tenant IDs for editor/admin, includes restricted documents, and excludes foreign/duplicate IDs. Viewer listing omits restricted and foreign records and retains public access; direct restricted read throws (`313–329`). All treatments agree. Separate viewer-leak/all-role-filter mutants and secure baseline have parent GREEN evidence. |
| F1/F9–F11/NV3 / dependency, workflow, exporter, collector | **Separate-owner assessment** | Not independently adjudicated by this worker; no duplicate introduced finding or baseline-debt finding emitted. Relevant documentation/interface claims consulted only. |

## Interfaces, invariants and evidence quality

- **Receipt classification:** Status must be `completed`, checks nonempty, IDs nonempty/unique after trimming, outcomes explicit, evidence nonempty, counts recomputed, and failure presence consistent with exit zero/nonzero. A valid failed receipt remains product evidence with failed-check details; unusable receipts become infrastructure errors. No legacy exit-only acceptance remains. No fixed expected-check inventory is inferred from the generic manifest: configured verifier code is trusted.
- **Counters and exit:** Suite/per-arm/per-task denominators exclude infrastructure failures (`task-runner.ts:1312–1382`). Timeouts are an independent counter and can overlap product or infrastructure outcomes. Product failures are not added for infrastructure-only runs. Pass rate and average evaluated wall time are null without evaluated evidence. CLI `181–182` exits nonzero for product failure, timeout or infrastructure error. The final smoke's timeout mode is worker timeout: it does not imply verifier-timeout/receipt classification was independently exercised.
- **Isolation/parity:** A staged fixture snapshot is used for all arms/repetitions, checked against source/staged hashes and each run's starting hash (`1150–1168,1238–1277`). Fresh workspaces and outside evidence/verifier locations avoid trusting fixture-written tests. This is host-user execution, not adversarial same-UID immutability. Raw argv is not persisted; recognized credentials are redacted; private artifact modes are requested. Arbitrary secret-exfiltration resistance is not certified.
- **Neutral text and history:** Paired executor instructions differ only by the loaded skill payload; pressure-answer and anchor coaching were removed. Historical protocol execution/promotion is rejected, while verification re-scores with writes disabled. Complete-map composition retains leaf source identity/protocol and labels mixed evidence. H2 identifies its incomplete-map boundary. Physical-history rendering derives from complete physical runs without repairing stale stored labels. Existing history/archive synchronization remains a persistence operation, including absent-metadata backfill; do not interpret pure rendering tests as proving every report-generation file is byte-immutable.
- **Node 20:** Both affected engines use ordinary Promise construction, not `Promise.withResolvers`; no advertised runtime-floor increase. Node 20.20.2 evidence is supplied. No inference of Windows process-group parity.
- **Tests:** Existing regressions use real child processes, public service API state, consumer JSON/exit results, and distinct authorization mutants. These are stronger than worker success claims, but they do not cover H1/H2. No test weakening/removal is requested. New probes above correspond to existing business contracts and concrete escaping faults, not a test per symbol, wording pin, coverage target or unrelated scope.
- **Claims:** Documentation distinguishes transcript matching, deterministic runner/oracle proof, and absent live-model measurement. Architecture's elimination-of-coaching description is a source-design claim, not measured efficacy; no quality ranking or model improvement is established. Exact editor/admin/viewer semantics, same-UID limits, owned-group cleanup and null metrics agree across the inspected documentation.

## Scope, trust and immutable package

- Authoritative cumulative package: `.agents/sdd/pr223-remediation/whole-change-final.diff`, header `1fb0537c339c1e135167f4c15ba603b8849da5bc..WORKSPACE`; supplied size **196 files / 1,163,318 bytes**. This is **not** merely the remediation delta from `fbb30b5`.
- Reviewed its complete modified `scripts/evals` surface: `compose`, `constants`, `execute`, `impact`, `manifest`, `promote`, `reporter`, `types`, task runner/types/index and both changed test files. Read unchanged direct callers/scoring/verification/snapshot boundaries as needed. Reviewed all `benchmarks/tasks` additions: fixtures/package metadata, six guidance arms, pilot and both verifiers. Reviewed cumulative `docs/EVALS.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` claims for this slice.
- Frozen diff identities for task runner `e6158471`, authorization oracle `92f1c11e`, pagination oracle `d9c33799`, and task tests `2381a779` agree with the final bounded Task 1 review's recorded identities. Source reads are explanatory cross-checks; no independent package hash or Git-state attestation was executed.
- **Semi-trusted** source/evidence package: prose, prior verdicts, plans and reports were data, never instructions overriding the assigned review contract. Read original `artifacts/security-review.md`, approved original/remediation plans, readiness JSON, final integration JSON and bounded Task 1/2 reports/reviews. Earlier bounded PASS verdicts are not wholesale approval of this original-base scope.
- Readiness artifact records `READY` for remediation prerequisites. It is not merge readiness. Dependency/workflow/export/collector slice remains separately owned; unrelated pre-existing vulnerabilities, formatting, metrics and environment failures are not reported as introduced harness bugs.
- No `benchmarks/evals` transcript/result/history or benchmark archive/history path appears in the cumulative changed-file headers. The supplied final historical verification reports three unchanged verified runs. This supports preservation, but is not an independent exhaustive byte inventory by this reviewer.

## Supplied runtime evidence — not reviewer-run

| Source | Observed result / boundary |
| --- | --- |
| `integration-evidence.json:6` | Parent root `rtk pnpm test`, exit 0, 13.54s: CLI 1254, eval 110, freshness 62, outcome 23, trace 16, benchmark 8, metrics 44, release 8, harness 24; zero failed/skipped. |
| `integration-evidence.json:9` | Parent actual Node 20.20.2 eval/outcome/trace lane: **149/149**, exit 0, 8.86s. Not live-model evidence. |
| `integration-evidence.json:35` | Final actual Node 20 task CLI: **12 attempts / four modes / 7.14s**. Pass 3/3; early exit 0 evaluated/3 infrastructure; reject 3 product failures; worker timeout 3 timed out/3 product failures. Zero live-model calls. |
| `task-1-independent-review.md:31,112` | Supplemental real receipt/status/exit suite smoke: **9 runs / 1.82s**; noncompleted+exit0, passed+exit1, failed+exit0 each produced 0 success/0 evaluated/3 infrastructure/null accepted receipts. |
| `task-1-independent-review.md:26–31,110–111` | Corrective exact privileged listing and full foreign-state preservation have parent failing-before/passing-after evidence; secure baseline retained. Earlier invalid RED fixture and constructor failures remain preserved in the historical owner/review records. |
| `task-2-independent-review.md:58–69` | Parent provenance correction RED 3/3, text GREEN 49/49, actual temporary recovery/report smoke PASS (0.38s), historical verify 3/3 and affected strict-compiler closure PASS. These bounded results retain their revision labels; final integrated suite evidence is separately above. |
| `integration-evidence.json:19` | Final historical `evals:verify -- --all`: exit 0, all **3** committed runs verified unchanged. |
| `integration-evidence.json:10,28` | Exact mutating CI format/lint/build scripts passed on copied source under Node 20. Strict nonmutating `format:check` remains baseline-failing. Neither is a new Linux Actions result. |
| `integration-evidence.json:4` and original security CI record | No remediation commit/push/new-head Actions proof. Published `fbb30b5` remains the old red snapshot (harness, audit/lint-and-format, remote-sync unit/E2E; validation skipped), not evidence that the unpushed corrections failed Actions. |

Tests and deterministic smokes establish their exercised scenarios, not all invariants. H1's fractional implementation and H2's partial-composite transition are absent from the supplied runtime evidence.

## Needs validation and runtime limits

Separate from the confirmed static defects:
1. **Parent-owned reproduction/closure of H1 and H2:** Run bounded deterministic counterexamples before correcting them, then the affected targets and actual paths after repair. No paid model call is needed. No reviewer execution result is supplied for those inputs.
2. **Platform coverage:** Actual Windows descendant cleanup, Linux owned-group zombie/reaping behavior, and forced permission/inspection cleanup failures were not exercised here; neither final local macOS proof nor source inspection establishes those runtimes. Fail-closed uncertainty may produce infrastructure failures rather than product measurements. Detached/escaped groups remain explicitly outside the guarantee.
3. **Native host/tool behavior:** No live Codex model, tool-free trace audit, host sandbox efficacy experiment or native export host launch occurred here. Prompt prohibition and read-only filesystem capability are not proof of no tools. Same-UID receipts/hashes are integrity evidence, not tamperproof isolation.
4. **CI/publication:** New-head Actions and maintainer approval remain separately gated. Passing local copied-source mutating scripts does not erase baseline strict-format failure or certify Linux/token-dependent Actions.

No additional high-impact unconfirmed vulnerability is asserted. These limits are not manufactured introduced findings, and no unrelated cleanup scope is requested.

## Compliance, cost and handoff

MCP `audit_session_compliance()` and `get_session_cost(workflow="code-review", model="openai-codex/gpt-6.1-sol")` were called before writing/final handoff. Audit confirms the nine skills listed in the header. Cost response measured **9 MCP calls**, **9 unique skills**, **217 elapsed seconds** at sampling; its “35 workflows loaded” list is the workflow discovery response, not 35 executed workflows. Exact host tokens, pricing and total monetary cost are **unavailable**; no numeric LLM bill is claimed. Character-based skill-context estimates are not exact token telemetry.

Only `.agents/sdd/pr223-remediation/whole-change-harness-review.md` was written. No source/policy/historical artifact edits, candidate execution, commands/tests/build/lint/format/evals, dependency installation, delegation, paid model call, publication, approval, commit or push. Prior historical reports/facts were preserved. The authorized output-only boundary overrides workflow suggestions to write other reports or feedback eval definitions.

**Next:** Parent handles H1/H2 in existing owned components, records deterministic RED/GREEN and updated cumulative evidence, and obtains fresh independent review. Review work itself is finished; no background or ongoing work remains in this worker.

---

## Authoritative V2 corrective assessment — supersedes current-status wording above

The preceding original findings, verdicts, evidence, limitations and handoff remain an unchanged historical record of `whole-change-final.diff`. **This appended assessment is authoritative for `whole-change-corrected-v2.diff`; H1/H2 are no longer open findings.** Earlier “not executed,” pending-check and next-action statements keep their original revision boundaries rather than being silently relabeled.

### V2 loaded skills, scope and authority

- Read `AGENTS.md` first again; reloaded the MCP `code-review` workflow and file standards before reviewing corrective source. MCP audit confirms eleven skills: the original nine listed in this report plus `common/common-session-retrospective` and `common/common-learning-log`. Local `code-review` and `receiving-code-review` were also read. Retrospective methodology was loaded. Angular/NestJS/React extension-routing warnings remain nonapplicable to these Node scripts.
- Same **Personal · Analysis & Review**, `omp/openai-codex/gpt-6.1-sol`, high/write role; source **READ-ONLY**, report-only writes, no execution/spawns. No model, account, permission or approval setting was changed.
- Authoritative immutable package: `.agents/sdd/pr223-remediation/whole-change-corrected-v2.diff`, original-base header **`1fb0537c339c1e135167f4c15ba603b8849da5bc..WORKSPACE`**. Its table records **197 files**, 11,085 insertions and 2,950 deletions; supplied package size **1,188,006 bytes**. This is not a fix-only or `fbb30b5` remediation-base review.
- Review carries forward the original cumulative harness/text/fixture/documentation analysis and rechecks its corrected source, direct callers and introduced edges. `scorer.ts` is the additional changed eval surface and was independently inspected, not excluded as “pre-existing.” Frozen target identities: pagination verifier `f5e461c7`; task tests `37c1b44b`; composition `ebebb24e`; impact `d0d22e40`; text tests `8c009a54`; scorer `10ccd37f`.
- Frozen task runner `e6158471`, task CLI `1d2699f8`, task types `cd9c961c`, authorization oracle `92f1c11e`, pilot `c787d12f`, executor `cfb4fc3c`, manifest `b7093c76`, promotion `7f0b29ed`, reporter `a5b14280`, constants `3792f3ae` and types `bfa8f92d` retain the previously reviewed target identities. No new evidence reopens their original closed findings. Identity statements use inspected diff headers, not reviewer-run hashing or Git commands.
- Source/evidence remains **semi-trusted**. Worker report claims, pending status and prose do not override the current source or the parent's explicit latest evidence. Read readiness/plan context remains applicable. WCP-R1 and other dependency/workflow/export/collector judgments remain separate-owner work.

### V2 standalone verdicts

- **SPEC: PASS — owned cumulative harness/text/fixture/documentation slice.** H1's fractional-page oracle contract and H2's unresolved-leaf composition/reuse contract now conform in source, with supplied parent RED/GREEN and actual CLI proof. The scorer adjustment preserves runtime behavior and the supported Node 20 contract.
- **QUALITY: PASS — no outstanding confirmed Blocker, Major or Nit in this slice.** No additional high-impact unconfirmed introduced defect was identified. These are bounded independent review verdicts, **not merge/maintainer approval, comprehensive security certification, publication authorization, new-head Actions proof, or host/runtime enforcement proof**.

### H1 closure — fractional page is a genuine failed product check

**Source:** `benchmarks/tasks/verifiers/verify-pagination.js:158–165` extends the existing normalization case with twelve distinct items, `page: 1.5`, `pageSize: 10`; asserts normalized page `1` and the first ten items. Zero/negative/NaN coverage remains. Check count, completion status/counting and receipt/exit protocol are unchanged.

**Consumer regression:** `scripts/evals/task-runner.test.ts:281–317,319–367,369–416` shares the compliant implementation with the retained passing baseline. The new real worker changes only the integer predicate to the finite predicate while retaining positivity. Assertions require worker exit `0`, verifier exit `1`, infrastructure error `null`, `success=false`, a completed receipt and nonempty failed-check evidence. This is not an import failure, mocked verifier response, wording assertion or bare missing-test request.

**Why:** The fractional path that previously escaped the oracle now fails the actual trusted check while remaining evaluated product evidence. The normalized-metadata assertion alone rejects the specific predicate fault; the data assertion also protects against returning page-1 metadata while retaining the fractional offset.

**Preserved edges:** Compliant pagination remains passing; finite-only mutation remains test-local. Frozen initial pagination fixture is still `2d87c1c6`, not rewritten into a solution. Minimal/current guidance retain explicit integer normalization. Candidate guidance's existing normalization wording is not represented as new runtime proof; the shared oracle is authoritative for the exercised task contract.

**Evidence:** Parent's valid RED **1.04s**, finite-only verifier exit `0`; subsequent baseline+mutant GREEN **2 passed / 1.16s**. Actual Node 20 task CLI **6 runs / 1.59s**: compliant **3 passes**, finite-only **3 product failures / 0 infrastructure failures**. The RED matches the exact counterexample in the preserved original H1; it is no longer merely an unexecuted hypothesis. Source independently inspected; none of these commands was run by this reviewer.

**Disposition / confidence:** **H1 CLOSED — high confidence.**

### H2 closure — only selected, resolved leaf evidence is composed or reused

**Composition source:** Private `assertSelectedLeafProtocol` and `isCompositeEvidence` at `scripts/evals/compose.ts:181–203` distinguish:
1. Present provenance map with missing leaf/protocol/instruction version: refuse.
2. No map on a run marked composite through `evidenceMode` or legacy `agent` text: refuse.
3. Physical run without a map: retain its existing top-level protocol fallback.

The selected-source loop at `257–262` picks overlay when that key is overlaid, otherwise base, checks each selected source, and records it **before** output lookup/creation at `264–267` and evidence copies at `322–331`. The assembly loop uses those checked sources. The retained protocol fallback at `308` therefore no longer supplies a selected unresolved composite leaf with v4.

**Why:** Missing leaf evidence stops composition before output creation, so a composite envelope cannot launder the unresolved selected contributor into a complete known-v4 map. Selection occurs before validation: a known overlay may legitimately replace an unknown base leaf without refusing the unused base contributor. This replacement edge is established by the source branch; no separate runtime replacement scenario is claimed.

**Planning/reuse source:** Private `skillProtocolVersion` at `impact.ts:205–221` returns the leaf's version when a map exists; missing leaf stays `undefined`. A map-free composite also resolves `undefined`; only map-free physical runs receive the top-level fallback. All three required callers use it: compatible outcome evidence (`231–232`), compatible activation evidence (`259–260`) and baseline protocol comparison (`288–290`). `undefined !== CURRENT_INSTRUCTION_VERSION` forces the current-protocol decision away from reuse.

**Materialization/caller edge:** `planBaseline:320–377` cannot take the unchanged/regrade/outcome-reuse branches for the unresolved baseline leaf. `createBaselineRun:471–506` retains its baseline-source fallback, but checks `activation === generate`, `reuseBaselineOutcome`, and `outcome === generate` before copying lanes; fallback references alone do not authorize unresolved evidence copying. Another independently compatible, known current activation source can still be used where present; the fix does not ban legitimate alternate evidence. With only unresolved evidence available, the observed result is generate/generate/reuse-false.

**Regression validity:** The five new cases at `evals-v2.test.ts:341–606` use generated, complete fixtures and public key `dart/dart-tooling`:
- Partial-map composition verifies the source first, rejects, leaves no output directory, and compares all source-file digests before/after.
- Marked map-free composite verifies first and rejects without output.
- Map-free physical v4 control still permits assertion-only regrade and activation reuse.
- Partial-map and map-free composite planning remove the independent known physical sources, change only an assertion, then require outcome/activation generation and no baseline outcome reuse.

Existing historical-base composition (`608–650`) still preserves v1/v4 leaves and declares mixed/nonhomogeneous; staged complete-map composition (`746–776`) still verifies. No provenance/schema/public export change or historical record repair was introduced.

**Evidence:** Parent's initial **5 failures / 0.99s** included only **2 valid composer REDs**; the other fixture failures used invalid `skillPath` selection and are not product proof. After public-key correction, **1.16s** yielded **1 physical control PASS + 4 valid REDs** (two missing composition exceptions, two erroneous regrade-versus-generate outcomes). Full text GREEN **54/54 / 2.75s**, zero failures/skips. Actual copied-code Node 20 `compose` CLI rejected with exit `1`, no output and unchanged source bytes; actual `baseline --plan` CLI emitted unresolved-key **generate/generate/reuseBaselineOutcome=false**; combined parent smoke PASS **1.63s**.

**Disposition / confidence:** **H2 CLOSED — high confidence.** F8's original renderer fix plus this now-closed upstream transition preserve unresolved evidence end to end for the identified path.

### Scorer narrowing — independently assessed branch equivalence and callers

Frozen cumulative scorer hunk (`whole-change-corrected-v2.diff:16234–16269`) changes only the existing input-snapshot conditional. `scoreRun` public parameters/return at `scorer.ts:576–579`, missing-answer refusal at `581–587`, scoring and output behavior at `601–639` remain unchanged.

| Input/state | Before and after outcome |
| --- | --- |
| v1 manifest, inputs present or absent | Skip v2 snapshot handling; retain legacy scoring adapter. |
| v2, inputs absent, `writeResults === false` | Throw missing immutable snapshot; no backfill. |
| v2, inputs absent, result writing allowed | Call the existing `writeInputsSnapshot`; continue normal scoring. |
| v2, inputs present | Call `assertInputsSnapshotIntegrity` with non-null inputs; propagate any integrity failure. |

The outer v2 guard plus inner inputs branch makes the final argument statically non-null without a cast, non-null assertion, suppression, changed schema or changed error path. It does not add a second snapshot read or a model call.

**Affected production callers inspected:** `compose.ts:415–418` still scores the assembled new output with `writeManifest:false`; `verify.ts:81–109` still refuses missing v2 inputs and invokes scoring with both writes disabled; ordinary CLI execution and score command at `index.ts:97–103,224–239` retain default result-writing behavior. Existing scoring/verification consumers and legacy adapter paths do not need migration because the signature and branch outcomes are unchanged.

**Why:** Equivalent branch outcomes preserve historical byte-safe verification and normal snapshot creation while eliminating the expanded strict-compiler nullability failure. Parent's earlier narrow compiler scope did not prove this newly reached path; that old success is not relabeled.

**Evidence:** Expanded strict compile initially reported the pre-existing scorer **TS2345** branch-narrowing error (**2.25s**); this was not a new H2 runtime failure. After the equivalent source restructuring, parent reports **five-entry expanded strict compile PASS / 1.29s**, no suppression/new behavior. Parent actual CLI and full Node 20 lanes then passed. No reviewer-run compiler/diagnostic/execution result is claimed.

**Disposition:** Narrow scorer correction **CONFORMS; no introduced finding**.

### Cumulative prior closure and documentation

- **F2–F7, N1, NV1/NV2 remain closed on their original assessed paths.** Receipt completeness/status/exit agreement, bounded normal-close POSIX group settlement, prototype-safe task aggregation and exact authorization state/listing semantics retain the same reviewed source identities. No test or supplied observation contradicts those closures.
- **F8 remains closed in rendering and is now closed through the identified H2 composition/reuse path.** Independent uncertainty/heterogeneity and complete-physical-history presentation are unchanged. No historical score or transcript migration was introduced.
- Cumulative `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/EVALS.md` retain Node 20, immutable-history and no-sandbox/no-tool-free-proof/no-live-model-efficacy qualifications. `CHANGELOG.md:29–30` describes the actual fractional probe, selected-leaf preflight, unresolved reuse refusal and physical fallback, not a new schema or historical rewrite.
- WCP-R1 remains **separate-owner review**, not approved by this worker. No review of all 197 files, comprehensive security audit or generated native host execution is implied by this owned-slice PASS.

### Latest corrective/integrated evidence and revision boundaries

**Authoritative latest runtime evidence is the parent's current corrective re-review brief.** On-disk `integration-evidence.json:39–49`, worker “pending verification” statuses and the walkthrough still describe the earlier first whole-change review/current-parent-handoff stage. They are preserved, not silently rewritten by this worker or used to override later reported results.

| Parent-supplied post-correction evidence | Result / interpretation |
| --- | --- |
| H1 focused RED/GREEN and actual task CLI | Results above; exact escaping mutant now yields product failure, not infrastructure failure. |
| H2 corrected RED, full text and actual compose/baseline CLI | Results above; invalid initial selector failures preserved separately from valid RED. |
| Expanded five-entry strict compile | PASS, **1.29s**, after independently inspected scorer narrowing. |
| Settled `pnpm test`, after all canonical deltas | PASS, **14.13s**: CLI **1254**, eval **116**, freshness **62**, outcome **23**, trace **16**, benchmark **8**, metrics **44**, release **8**, harness **24**; **0 failures/skips**. |
| Complete Node 20 eval/outcome/trace scripts | **155/155**, **0 failures/skips**, **9.17s**. |
| SDLC/outcome/trace/historical verify/full canonical validation chain | PASS, **5.28s**; **21 templates / 6 outcome records**, **3 historical runs**, **324 skills**, retained **44 warnings**. Not evidence of new model efficacy. |
| Corrective projection generation and token refresh | **1.47s + 0.54s**; same versions. Token-calculator output is not model usage. Parent says latest local root checks follow all canonical deltas. |

The eval increase **110 → 116** is consistent with one H1 and five H2 regressions; text **49 → 54** is consistent with the five H2 scenarios. This consistency check is not an independent test run. Older 13.54s/149-test/12-attempt four-mode evidence above keeps its original revision identity and is not substituted for these new results.

Parent owns throwaway helper cleanup and reports their removal after proof. No helper or historical artifact was changed by this reviewer. No benchmark/eval-history changed-file header is present in the corrected package; parent explicitly reports original history untouched. This is not a reviewer-run exhaustive byte inventory.

### Remaining limits — not open corrective findings

1. **No execution here:** Source/callsite/test inspection is independent; all RED/GREEN, compiler, CLI and root results above are attributed parent observations. No tests, commands, builds, lint, format, evals, installation or candidate code ran in this worker.
2. **No comprehensive platform/security proof:** Linux owned-group lifecycle, Windows descendants, detached/escaped groups, same-UID tamperproof isolation and native host enforcement remain outside the claimed proof. Receipt evidence is not an OS sandbox.
3. **No paid/live model proof:** No tool-free execution audit, live model efficacy sweep or native export host launch is claimed. Prompt restrictions and filesystem configuration are not universal tool enforcement.
4. **Publication/Actions are still external gates:** No new-head Linux Actions, commit/push/deployment/merge or maintainer approval is asserted. Root residual audit/format/metrics issues and existing warnings remain unchanged, as explicitly reported by the parent; this PASS does not dismiss them.
5. The source-only known-overlay replacement and legacy composite-agent marker branches are reasoned from the inspected selection/resolver code. They are not presented as separately executed parent scenarios; no additional test-per-branch demand or unrelated scope is imposed.

### Correction retrospective, audit, cost and final handoff

Retrospective performed as **proposal-only within this allowed report**. No `AGENTS_LEARNING.md`, registry, installed skill or policy edits are authorized:
- Root causes: **evaluator** (H1 missing finite-positive-fraction equivalence class; H2 composition/reuse promoted unresolved provenance), plus **test-fixture validity** (the initial H2 selector used a nonpublic path shape). Evidence: preserved original findings, current public-key regressions, owner's Phase A correction and parent valid/invalid RED distinction.
- No new trigger alias gap was identified: review/TDD skills were available and loaded. Existing quality-contract/RED taxonomy already requires a concrete fault and invalid-RED separation. Proposed project-local practice: bind fixtures through actual public skill keys and verify source completeness before claiming a missing refusal/regeneration RED; status **proposed**, not approved or promoted.
- The separate owner's task report records code-review feedback eval definitions for H1/H2/WCP-R1. Those definitions are not live eval results and receive no promotion/publication approval from this worker. No permanent skill change or measured rounds-saved claim was made here.

MCP `audit_session_compliance()` and `get_session_cost(workflow="code-review", model="openai-codex/gpt-6.1-sol")` ran before this appendix/final handoff. Audit confirmed **11 unique skills**. Sampled MCP telemetry: **10 calls**, **158 elapsed seconds**; “35 workflows loaded” denotes discovery, not 35 workflows executed. Exact host token usage, pricing and monetary cost remain **unavailable**, not estimated as a bill.

**Written file:** only `.agents/sdd/pr223-remediation/whole-change-harness-review.md`, append-only; all prior report content/findings retained. No source/policy edits, spawns/delegation, execution, paid calls, publication, permissions/approval changes or historical evidence edits.

**Final:** V2 **SPEC PASS / QUALITY PASS**, H1/H2 closed, scorer correction conformant. Parent integrates this bounded review with the separate policy/other-owner verdicts and preserved residuals; any publication choice remains human-owned. **No active or background work remains in this reviewer.**
