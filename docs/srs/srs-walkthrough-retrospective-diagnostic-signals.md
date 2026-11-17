# Walkthrough: Retrospective Diagnostic Signals And Decision Record

## Scope

Evidence behind [srs-retrospective-diagnostic-signals.md](srs-retrospective-diagnostic-signals.md). The initial design findings below are historical; later sections record implementation, failed gates, corrections and verification. Source-ready is not an acceptance result.

## Evidence

| Claim | Tag | Source |
| --- | --- | --- |
| The strict stored-ledger schema is pinned to version 1 and is used only by `loadCommittedLedger` | confirmed | `mcp/src/retrospective/run.ts:367-404`, `:481-532` |
| The index parses ledgers loosely and counts any `schemaVersion` other than 1 as unreadable | confirmed | `mcp/src/retrospective/index-report.ts:263-289`, `:478` |
| The trend reader parses loosely and has no version gate | confirmed | `mcp/src/retrospective/trend.ts:78-90` |
| Stored improvement rule and destination ids, and claim templates, are closed enums | confirmed | `run.ts:110-130`, `:299-319` |
| The index falls back to "other" for an unknown rule id | confirmed | `index-report.ts:875` |
| Overall coverage ignores unread agents; partial coverage blocks recommendation claims | confirmed | `ledger.ts:1139-1145`, `:2483-2489` |
| Coverage and delegation header text is built in two places | confirmed | `views/summary.ts:350`, `views/report-html.ts:374-377` |
| Created agents are counted from `create_agent` and `task` calls in the main file as one number | confirmed | `discovery.ts:287-299` |
| Children are linked only by a `parentSession` header or a nested `task` directory | confirmed | `discovery.ts:543-578`, `:772-826` |
| Aggregation is one streaming pass; `toolResult` rows carry tool name and error flag in file order | confirmed | `aggregate.ts:1053-1072` |
| Stop reasons are aggregated per node as bounded identifiers | confirmed | `aggregate.ts:1126-1132`, `:702-717` |
| Permission requests arrive as user rows and verdicts as `respond_to_permission` calls joined on a request id | confirmed | `aggregate.ts:1022-1043`, `:1318-1367` |
| This server's calls are recognised from the `write` device path; the tool name is all that leaves the module today | confirmed | `server-tools.ts:1-9`, `:101-122` |
| Retrospective tools are registered on stdio only | confirmed | `mcp/src/server.ts:417-450` |
| Consent schema is strict; schema parse precedes the version check; revalidation compares store root and source roots | confirmed | `consent.ts:75-88`, `:117-136`; `run.ts:538-555` |
| The `ags` command forwards `--store-root` and `--source-root` to the MCP command | confirmed | `cli/src/commands/retrospective.ts:146-199` |
| Aggregation limits are 512 MiB and 60 seconds per run; the tree is capped at 64 nodes | confirmed | `run.ts:92-95`; `aggregate.ts:433` |
| Paseo agent records hold `id`, `provider`, `persistence.sessionId`, `labels["paseo.parent-agent-id"]` | confirmed | structural probe of the operator's local records, key names and counts only: 650 records in 123 directories, all provider `omp`, largest 2,711 bytes |
| A child record's session id names a session file inside the consented OMP root | confirmed | same probe: 282 of 282 sampled children matched a file name of the form `<timestamp>_<sessionId>.jsonl` |
| A root record can be found by session id | confirmed for 131 of 150 sampled root records; the other 19 had no session file | same probe |
| User rows carry no marker separating human from host notification | confirmed for the sample: 858 user rows in the five largest sessions, every `attribution` equal to `user`, 124 with `steering: true` | same probe, metadata fields only |
| The agent-record file name equals the record `id` | assumed | observed path shape only |
| Providers other than OMP expose the same four fields | unknown | no such record exists locally |
| `PASEO_HOME` or another override moves the agents directory | unknown | not checked; the root is explicit in the consent record, so no override is relied on |
| Thresholds (failure run 3 and 5, run count 3, idle gap 600 s) | assumed | design defaults; no measurement behind them |

## Not run

- No unit, integration, security or evaluation check. All verification in the SRS is planned.
- No measurement of scan time for agent records or of aggregation time for a 64-node tree.
- No independent review of this design. Two read-only scout tasks started to map the views and the stored-ledger readers failed for provider reasons before returning anything; those files were then read directly.

## Boundaries observed

- The operator's stored reports and session files were touched only for key names, field types, counts and file names. No message text, command text, title or label was read for this design.
- Nothing was written outside `docs/`.

## Implementation checkpoint — 2026-11-16

The design-stage evidence above remains historical. The operator subsequently authorized implementation, accepted DD-1/DD-2 and selected Subagent-Driven execution. Current status is **partially implemented**, not verified.

| Lane | Observed result | Boundary |
| --- | --- | --- |
| Frozen dependency installation | PASS: `rtk pnpm install --frozen-lockfile` | Initial CLI check could not find vitest; no behavioral RED was claimed. Package build scripts were skipped by the existing package-manager policy; controls were not changed. |
| Generated MCP guidance consumer | PASS: 77 tests in `IndexGeneratorService.spec.ts` | Last run includes the corrected agent-selected/rule-vs-explicit-human wording. |
| Decision evaluator finite controls | PASS: 57 tests, `rtk node --import tsx --test scripts/evals/decision-fidelity.test.ts` | These test scorer discrimination on supplied examples, not model efficacy. Independent review subsequently found an additional undisclosed-vocabulary defect; the next correction invalidates affected evidence. |
| Consent/agent-record reader Phase A | PASS: 26 tests in `retrospective-agent-records.spec.ts` and `retrospective-consent.spec.ts` | Discovery/run integration remains pending; no real consent or private session was read. |
| Slice 1 initial focused gate | FAIL: 52 failed, 291 passed, 7 files | Output preserved in `artifacts/runs/retrospective-diagnostic-signals/slice-1-failed-check-full.log`. |
| Slice 1 corrected focused gate | FAIL: 43 failed, 300 passed, 7 files | Remaining failures: 30 publication/orchestration cases return INTERNAL_ERROR and 13 index-collection cases find no rows. Failure cause remains under independent investigation; passing unit/views cases do not establish publication. |
| Canonical export generation | PASS using supported `generate-indices --adopt-base 24d9034d21d3b2ab5815236d20ba32a4e85c4c04`, then a later ordinary generation | Original apply correctly refused outputs without provenance. Baseline proof allowed generated-only changes; generated exports must be refreshed again after final guidance edits. |
| Scoped evaluation preflight | PASS: 0 issues; one-skill, 40-case manifest prepared | Manifest `all-v2.7.4-2026-11-16T15-35-06-818Z-30c172f5` is stale after later corrections. No model answers executed; AC-020 remains unproven. |
| Independent guidance review | CHANGES REQUESTED | Required correction limits reached; operator explicitly authorized additional bounded recovery. Findings and fixes remain review evidence, not authenticated release approval. |

### Execution boundaries and recovery

- Cheap route was ineligible after an account-disabled provider response. Configured DeepSeek could not launch because its model was not found; implementation uses the existing Personal Delivery profile with its configured model and effort. No premium profile was invoked.
- The reviewer permission bridge returned `No pending permission request` for three freshly delivered read-only approval requests. This was reported through `xd://report_issue`; reviewer used direct repository reads without altering approval controls.
- All implementers are forbidden to delegate or commit. Coupled ledger/view work stays with one owner; consent/reader Phase A and skill guidance have disjoint owners.
- Slice 1 and Slice 5 are not complete merely because a worker reported source-ready. Slice 3 Phase A is not a finished linkage feature. Slices 2/4, full integration, actual report/browser smoke, live efficacy evaluation and whole-branch independent review remain pending.

### Subsequent integration evidence

- Slice 1 runtime failures were independently traced to missing native `skillUsage` input and an out-of-scope index `coverageClaim`. After correction, MCP typecheck and the run/index suites passed (88 tests). Later signal/linkage edits require a new integrated gate.
- Final guidance finite controls passed 58 tests; generator consumer tests passed 77. Independent source review found no remaining substantive guidance defect. These results do not measure model efficacy; the operator cancelled live evaluation authorization, so AC-020 remains unverified.
- Frozen CLI forwarding verification passed: `rtk pnpm --filter agent-skills-standard exec vitest run src/commands/__tests__/RetrospectiveCommand.spec.ts` (33 tests). This does not verify the MCP CLI implementation or real consent.
- Independent linkage review requested corrections for ancestor-path races, consent disclosure, opt-out fallback, traversal bounds and unsupported-provider attribution. The missing `paths` declaration allegation was withdrawn after full-source inspection. Corrections and re-review remain pending; earlier reader tests do not verify reopened code.
- The approved Paseo API reports provider `omp` separately from model identity. Only that provider maps to the OMP transcript reader; other providers must remain unlinked rather than borrowing an OMP session identifier.
- Documentation is source-ready, not runtime-parity verified. No release, real consent enabling, private session read, or live evaluation occurred during this integration checkpoint.
- Actual CLI smoke exposed a gap that wrapper tests missed: `rtk pnpm --filter agent-skills-standard exec tsx src/index.ts retrospective enable --help` did not expose either new agent-record option. The CLI entrypoint registration is reopened for correction; 33 passing wrapper tests do not establish end-to-end flag support.
- After entrypoint correction, the two CLI suites passed 35 tests and actual `retrospective enable --help` displayed both new options.
- The reopened Darwin reader/consent gate failed: 5 failed, 24 passed, 29 total. Valid record reads returned no records and listing/race hooks were not reached. The reader mechanism is under correction; consent results do not establish working linkage.
- The first frozen-engine typecheck stopped on seven errors across reader handle nullability, aggregate source-union narrowing, a missing ledger improvement type, and three nonscalar claim-fact assignments. The chained engine suites did not run. Owners received exact diagnostics; no runtime pass is claimed.
- The next corrected engine gate passed typecheck and 423 tests; one consumer-smoke test failed and one test was skipped. Remaining mismatch: the synthetic replay expects one unlinked host agent, but the published tree reports zero created and zero unlinked. Publication succeeds, but host-accounting acceptance does not.
- Three successive integration gates have failed. Further engine edits/checks are frozen pending human direction under the execution stop rule. No final consumer harness/browser success is claimed.
- Darwin diagnosis confirmed `ENOENT` for `/dev/fd/<fd>/<child>`. Full linkage scope requires a material platform-integration decision; no native dependency or weaker absolute-path fallback has been authorized.
- The operator subsequently authorized one bounded host-accounting recovery with the existing Personal Delivery profile and selected secure native-bridge **design only**, preserving full linkage scope. Native dependency/implementation approval remains separate and ungranted. No unsafe fallback, release, private read, or live efficacy run is authorized by that decision.
- The authorized host-count correction normalizes wrapped tool names before creation-call accounting. Its focused verification passed typecheck and 27 tests, but the consumer-smoke test failed at artifact export: it creates the destination directory and then calls `fs.cp` with an existing-target rejection. No successful harness/browser run is claimed. The fixture uses a synthetic AGS-owned creation alias; it is not proof of native Paseo tool adoption.
- Independent engine review reported eight substantive issues: inherited-object mutation/unbounded streak maps; decision retention priority; missing decision measurement shown as zero; discarded zero-second permission latency; main activity rate using tree-wide turns; attribution/notification classification; missing timestamps shown as zero; inconsistent worker labels. These findings remain uncorrected and prevent acceptance despite the earlier passing tests.
- The requested Darwin design is recorded in [the proposed secure-ingress ADR](adr-retrospective-darwin-secure-ingress.md). A repository-owned Node-API bridge is proposed with separate feasibility, implementation and distribution gates. No native proof, dependency change or implementation is authorized yet.
- The operator authorized one bounded remediation pass for the eight review findings and smoke-export defect, plus an isolated native feasibility proof using existing compiler/Node headers only. The proof owns new artifact files only; production native wiring, dependencies, CI and packaging remain unapproved. No automatic prerequisite installation is permitted.
- Canonical generation and its check-only drift gate passed after the documentation handoff. Updated managed local-preparation references and `.skills-lock.json`; no installed copy was hand-edited.
- MCP compliance telemetry reports zero returned skill/workflow bodies in this server session. Earlier direct skill/file reads and worker consultation receipts are outside that observation stream; the zero must not be presented as evidence that no standards were consulted, nor as a successful delivery/enforcement audit.
- Native Gate A's first author-run build compiled and loaded on Darwin arm64/Node 26, but the proof failed at a synchronous guard incorrectly tested with `assert.rejects`. Critical ancestor-replacement checks were not reached; compilation is not a containment pass.
- Independent proof review requested pre-narrowing numeric-limit validation, actual NUL coverage, the correct `parentAgentId` projection and a native child-open **after** ancestor replacement. These are included in the same unexecuted proof-correction pass; production native integration remains unapproved.

## Current recovery and Gate B checkpoint

- Fresh bounded engine recovery corrected own-safe rule references, window decision-measurement coverage, independently nullable main timing, explicit failure-cap truncation, permission timestamps and nullable scalar claim facts. Independent final source review found no substantive remaining finding in that recovery scope.
- Parent's post-correction gate passed typecheck and 435 tests; one obsolete positional summary assertion failed and one test was skipped. The operator approved an inline assertion-only correction. The subsequent narrow views suite passed all 56 tests. No fresh all-green nine-suite run is claimed.
- The synthetic consumer replay/export passed. Existing Chrome rendered `visual-proof/index-desktop.png` and `report-desktop.png` from `synthetic-output-fresh-final`; both were visually inspected. Decision measurement coverage, ACT/WATCH rows, tree gap, permission disclosure and pending-review matrix/backlog were visible. Chrome retained its default sandbox and used disposable profiles; no DOM injection, download, user profile or permission change was used.
- Additional CDP link/disclosure interaction verification was blocked before execution by the bash policy's `*format*` match on a screenshot parameter. It was reported and not bypassed. Native disclosure interaction is not claimed; screenshot evidence and limits are in `artifacts/runs/retrospective-diagnostic-signals/visual-proof/receipt.json`. The owned loopback server was stopped.
- Corrected native Gate A compiled and passed the isolated proof on Darwin arm64/Node 26 using existing headers and Node-API 8. Independent review is clear. `native-proof/parent-verification.json` preserves exact source digests and observed checks. This establishes local feasibility only.
- The operator separately approved production Gate B for Darwin arm64/x64 and glibc Linux arm64/x64, including native C, adapters/ingress migration, package assets and CI configuration, with repository maintainers owning release artifacts. [The frozen native execution contract](retrospective-native-ingress-implementation.md) assigns disjoint core, integration and packaging owners. Implementation and parent gates are now pending.
- No remote CI execution, publication, dependencies, downloads, permission changes, commits, private-data reads, real consent changes or live model evaluation are authorized. Node 20 and nonlocal native targets remain unexecuted; full linkage acceptance and AC-020 efficacy are not claimed.

## Native implementation verification — 2026-11-17

- The first production-native build stopped on a C helper/callback symbol collision; a separate source typecheck found three errors. Corrective source changes resolved these before runtime verification. No native pass is attributed to those failed gates.
- Native capability tests initially passed two cases and failed five at root traversal. Read-only metadata confirmed the test temporary root used a symlink alias. The operator selected a bounded worker-only fixture correction; production no-follow checks were unchanged. The corrected fixture then passed all seven cases.
- The next integration gate passed typecheck and 185 tests, with five failures and one skipped benchmark. Independent diagnosis identified native dot entries leaking into consumers, identity parsing skipped after analytics-budget exhaustion, and a stale filename-derived ID assertion. The operator authorized disjoint bounded recoveries. Native dot filtering now charges `visited` before projection; identity validation still examines digest-verified bytes when analytics time expires.
- Fresh local evidence: Darwin arm64 build and target asset verification passed; native capability suite passed 8/8. Source typecheck and six integration/consumer suites passed 192 tests with one pre-existing 100 MB performance benchmark skipped. Independent bounded recovery review found no remaining substantive finding. Other platforms and Node 20 were not executed.
- A scoped compiler project included the previously excluded ReadSource test: ordinary Node FileHandle assignment to ReadSource passed without descriptor adoption or assertions. This proves compatibility against the installed Node 26 declarations, not Node 20 declarations.
- Fresh MCP bundling passed. An offline package with lifecycle scripts disabled was extracted outside the repository and used with existing dependencies only. Public stdio preparation published a schema-v2 `native-files` ledger and linked/read one host agent through the packed addon. All home, consent, record and transcript inputs were isolated synthetic fixtures; `packed-native-FQjJwB/producer-receipt.json` records the lane.
- Packed negative-path attempts exposed two harness mistakes (the evidence-mode enum and a non-substantive new session), then an actual presentation limitation: removing the isolated package binary left ordinary tools usable but preparation returned only generic failure text. The operator authorized a new bounded task exposing only the three fixed native loader codes, without raw errors or paths. That change and its parent recheck remain pending; no fourth unchanged negative replay was run.
- The consistent internal names `NativeIngressApi` and `closeCursor` replace the plan's illustrative type/cursor-close names without compatibility aliases or a native API-version change. Numeric descriptor transfer, borrowed-source ownership and the remaining frozen contracts are unchanged.
- Source configuration covers four advertised native targets and strict same-run/revision artifact assembly. Full-workflow-only GitHub retries are the explicitly accepted restriction. Remote CI, nonlocal artifacts, Node 20 execution and full distribution acceptance remain unverified and unauthorized to run. Live model efficacy remains canceled/unmeasured.

## Local verification handoff — 2026-11-17

- Final presentation correction passed source typecheck, 105 tests across public-tool/HTML/consumer suites, and fresh bundling. Public failures expose only the three approved native-loader codes; arbitrary codes and raw paths remain hidden. Task-attempt versus host-record/fallback provenance is explicit.
- Whole-branch review identified lost host truncation and first-record-wins duplicate attribution. The operator authorized a bounded recovery. Conflicting/unprovable IDs are now quarantined; identical projections deduplicate. Known scan gaps reach ledger tree coverage even when retained created/read counts match. Source typecheck, four focused suites (171 tests), and bundling passed; independent amended whole-branch source review is clear.
- Fresh offline installed-package replay passed through public stdio MCP: `native-files` publication, host created/read 1/1, one recorded decision, distinct `NATIVE_ARTIFACT_MISSING` and `NATIVE_LOAD_FAILED` responses, and unrelated tools usable. `packed-verified-v0w8Bv/receipt.json` preserves actual call-start/result intervals; an earlier combined harness used a stale pre-start timestamp and correctly fell back to tracker-only. No product fix was inferred from that harness error.
- The current packed report screenshot was written and visually inspected: correct provenance, complete observed host linkage, one high-impact pending decision, matrix/backlog and no-authorization warning were visible. Chrome then exited 2 during teardown; this is rendering evidence, not a clean browser-process or interaction/navigation pass. Its disposable profile was removed.
- `audit:trace --slug retrospective-diagnostic-signals --required` exited 0 with ten missing BRD-objective link warnings. Its assurance is document-links-only; it does not verify implementation, execution or approval.
- The final MCP consultation audit reports zero bodies in its current server session (started 2026-11-17T06:31:13.172Z). Direct skill reads, previous-server observations and worker receipts are outside that stream. This is an observation gap, not proof of absent consultation or successful enforcement.
- Local implementation and reviewed source are verified; four-target/Node-20 acceptance remains open. Public Homebrew runtime locations offered Node 22/26, not 20, and the project cache had no Node-20 declarations. No download, remote CI, release, commit, private-session read or real consent change was performed. Live AC-020 efficacy remains explicitly canceled and unverified.
