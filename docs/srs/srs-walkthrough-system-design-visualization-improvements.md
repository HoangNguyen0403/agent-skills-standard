# Design Walkthrough: Visualization and N+1-aware design skills

Date: 2026-11-05. Scope: technical-design feasibility and artifact consistency only. [SRS](srs-system-design-visualization-improvements.md); [ADR](../adr/adr-system-design-visualization-improvements.md); [approved PRD](../prd/prd-system-design-visualization-improvements.md).

Sections 1–8 preserve design-time evidence, not current implementation acceptance. The maintainer subsequently approved corrections, Subagent-Driven execution and focused baseline repair. Current implementation/verification progress appears in section 9; no design-time probe is promoted into feature proof.

## 1. Source and authority

- Approved PRD before downstream design-link updates: SHA-256 `f1ed4fe790932e6500b5b29c4fca01c5cd06d3be292c8ee03322af81ca5d435f`.
- Original approved BRD before canonical AC relocation: SHA-256 `ea1270a08b12b91b3d8b81f64b585053d524f53565882ef4bd7e0f203839c4c1`.
- Canonical AC-01…09 remain in the PRD; source requirements and approvals were not renumbered. SRS-001…010 are new technical requirements, not replacements for those source IDs.
- Local source reads established existing render/validate/layout/export entrypoints, fixed text geometry/palette seams, special ERD/sequence paths, and strict-layout write-before-failure behavior. No future exported-symbol references migration is claimed.
- Read-only scouts found Python SQLite components, PostgreSQL/Postgres.app binaries and Docker installation metadata. They did not execute or connect to those services. The SQLite runtime below was exercised by the parent; installed PostgreSQL/Docker readiness remains untested.

## 2. Actual Desktop export smoke

Executed:

```text
rtk proxy python3 skills/common/common-architecture-diagramming/scripts/export_drawio.py skills/common/common-architecture-diagramming/assets/fixtures/context.drawio -f png -o /tmp/ass-design-smoke.olOA5u/context.png
```

Observed output: `wrote /tmp/ass-design-smoke.olOA5u/context.png`; exit 0. Existing fixture was not regenerated or modified. Read the actual PNG through the image tool; image dimensions were 2078×1614. Retained a byte-for-byte evidence copy at [design-baseline-context.png](../../artifacts/evidence/system-design-visualization-improvements/design-baseline-context.png).

- Existing input SHA-256: `57a43a861074f9efedbe5f493f95727f81812de14773a263140b9c1312be47df`.
- Retained PNG SHA-256: `c49f6f4ff89dfd2ac789dfd27ec0aeb2b77125abc3316a8c3badcad3bb4a64fa`.
- What passed: this local Desktop path exported the existing light context file to an actual readable image file.
- What did not pass: visual quality acceptance. The buyer/person label and its uncertainty warning are crowded; some main-flow connectors/arrowheads are difficult to discern at the displayed scale. This is an image observation, not a demonstrated root-cause diagnosis or a claim every fixture has the same issue.
- Not exercised: new dark palette, changed layout, all-eight-type image export, static HTML package, offline/no-network operation, contrast measurements or injection controls. Do not mark AC-02…06 passed from this smoke.

## 3. Actual query-shape feasibility experiment

Executed a temporary, dependency-free Python script against an ephemeral SQLite `:memory:` database. No app data, ORM, PostgreSQL process, Docker image, network service or external account was used. The non-executable archived source is [design-query-probe.txt](../../artifacts/evidence/system-design-visualization-improvements/design-query-probe.txt); its SHA-256 is `f05208943cb7c0bbdb99832f43790385fc3fb83db1996eb60e494eb21d2114b4`. The temporary executable copy is not a shipped fixture and is removed after archiving/verification.

Dataset and measurement:

- Parents 1…50; deterministic `parent-{id}` names.
- Each parent has `id % 4` children, so empty, single and multiple relations occur. Child IDs are `parent_id * 10 + offset`; fixed bodies are synthetic.
- Baseline: `SELECT id, name FROM parents ORDER BY id LIMIT ?`, then parameterized `SELECT id, body FROM children WHERE parent_id = ? ORDER BY id` per parent.
- Candidate: identical parent query, then one bounded-key `WHERE parent_id IN (...) ORDER BY parent_id, id` child query. Values use parameters; only placeholder syntax is assembled from the selected key count.
- `sqlite3.Connection.set_trace_callback` counted real emitted SELECT statements during reads, excluding setup/seeding/commit. It was cleared after each scenario.
- Actual linked SQLite version: **3.53.2**. Exact output is retained in [design-query-probe.json](../../artifacts/evidence/system-design-visualization-improvements/design-query-probe.json).

| Parents | Baseline SELECTs | Batch SELECTs | Results equal | Child rows | Serialized result bytes | Baseline ms | Batch ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 2 | true | 1 | 36 | 0.024 | 0.016 |
| 10 | 11 | 2 | true | 15 | 455 | 0.031 | 0.033 |
| 50 | 51 | 2 | true | 75 | 2455 | 0.295 | 0.084 |

These timings are single-run in-memory observations, not a benchmark, speedup target or proof that batching is always faster. At N=10 the observed candidate was slightly slower despite fewer statements. Serialized JSON byte counts are not wire/network bytes. At N=1 both shapes execute two SELECTs, so a one-parent check cannot reveal the amplification.

Limits: this experiment compared the two outputs but did not supply the independently authored full result oracle required for the future fixture. It did not exercise tenant scope, continuation pages, aggregate controls, request-scoped DataLoader, high fan-out limits, ORM lazy-loading or held-out model reasoning. Consequently AC-07…09 and VER-007…009 remain NOT RUN for the actual proposed implementation. The future LLD-004 fixture explicitly adds those oracles/controls rather than treating this diagnostic as acceptance.

## 4. Proposed trace grammar feasibility

Previously observed: the current source-defined trace patterns reject all 20 approved objective/requirement/AC IDs. The native run-record audit did not start because `tsx` and local node_modules were unavailable. That observed failure was not rerun to reconfirm it, and no packages were installed.

During this design, a dependency-free Node probe extracted the proposed patterns from SRS LLD-005 and exercised an explicit independent corpus:

- **24 accepted cases:** the 20 preserved source IDs plus legacy numeric objective/requirement/AC and SRS examples.
- **12 rejected cases:** lowercase/multiple namespaces, path fragments, short numeric requirement/objective suffixes, whitespace, wildcard/empty forms, doubled delimiters, one-digit acceptance suffixes, qualified AC and qualified SRS examples.
- Observed result: **PASS** for that proposed grammar corpus.
- Scope: this proves the written grammar is internally usable on the stated corpus, not that `validateRunRecord` was changed or its remaining checks executed. Native validator implementation remains unchanged and incompatible until an approved compatibility slice is delivered and verified.

The proposed D-TRACE change is expressly included in the SRS/ADR approval request; no source validator mutation or source-ID migration happened in this design task.

## 5. Design-quality and pending-gate disposition

| Concern | Evidence/disposition | Owner |
| --- | --- | --- |
| Source scope and six delivery slices | Approved by requesting maintainer in prior turns; no scope removal | Requesting maintainer |
| Theme/layout/export contract | Proposed LLD-001/002; existing export smoke only | Diagram/export implementers after authorization |
| N+1 runtime selection | SQLite linked runtime exercised; stronger future fixture specified, not shipped | N+1 fixture implementer |
| N+1 design/review behavior | Existing canonical rules reused; new behavior/evals not executed | Guidance implementer and independent evaluator |
| Text-to-markup/static package boundary | Detailed design raises risk to high/extended; no exploit or security acceptance claimed | Independent security reviewer |
| Semantic/architecture review | Pending; author self-check is not independent review | Independent reviewer, separate from implementation owner |
| Human technical approval | Pending for this SRS and ADR, including trace grammar compatibility | Requesting maintainer |
| Execution route and account eligibility | Not selected; implementation and live evaluation remain separately gated | Integrator and requesting maintainer |
| Native audit environment | Existing tsx/node_modules absence remains an owned prerequisite, not a passing check | Tooling maintainer |
| User benefit/contrast/offline/eight-type behavior | NOT RUN against proposed implementation | Assigned verifier and human validation owner |

No numerical design score or independent-review pass is fabricated. These observations support a concrete reviewable design, not `design_ready`, implementation readiness, deployment readiness or demonstrated ROI. The current design outcome remains `requirements_ready` with approval/review gaps explicitly retained.

## 6. Handoff

Review [the SRS](srs-system-design-visualization-improvements.md) and [ADR](../adr/adr-system-design-visualization-improvements.md). Technical approval covers those contracts only. Then resolve eligible independent semantic/security review and `implementation-readiness`; settle implementation execution mode and any live-eval usage authorization separately. Existing source IDs and the proposed compatibility mechanism must not be silently changed to make the record audit pass.

## 7. Artifact consistency and cleanup

A dependency-free design-artifact check passed: ten unique SRS cards match the run-record trace, each has one authoritative VER mapping, all five LLD contracts are present, and all 17 local links across SRS/ADR/walkthrough resolve. The record retains `requirements_ready`, pending independent/human gates and high/extended downstream metadata; no complete native schema or implementation acceptance is implied.

Archived PNG and diagnostic-source SHA-256 checks passed against the observed hashes, and the persisted query observations retain the measured counts/equality results. After that verified archive, the operation-owned temporary executable script and image were removed. Only the non-executable evidence text, observation JSON and baseline image remain as design evidence; no runnable production fixture or feature implementation was shipped.

## 8. Subsequent independent review and readiness checkpoint

The earlier pending-gate table is historical design-time disposition. The maintainer subsequently approved the technical baseline and explicitly authorized Personal review routing. Independent architecture/security reviewers completed their reviews and focused rereads of narrow publication/manifest/network-proof corrections; no residual material design blocker remained. The original architecture score was 63/70 applicable points, semantic rubric 16/16, revision-scoped and not rescored after delta. Human confirmation of the correction delta/execution approach remains separate.

See the [independent review receipt](design-review-system-design-visualization-improvements.md) and [slice-aware readiness assessment](implementation-readiness-system-design-visualization-improvements.md) for exact revisions and dispositions. One current baseline command ran 141 tests with seven existing fixture subtest failures, not a green baseline; no goldens were regenerated or source changed. Read-only investigation found representative unverified-style delimiter drift, with intended serialization awaiting owner adjudication. Native tsx/schema prerequisites remain unresolved. These are recorded source/environment gaps, not waived by documentary review or the earlier limited runtime probes.

## 9. Approved execution and verification in progress

The maintainer explicitly authorized “approve corrections; subagent-driven; repair baseline” and later requested continuation. Five bounded owners were dispatched through Personal - Cheap; the renderer owner resumed after a terminal abort without inferred quota exhaustion. Original scope/ACs remain intact. No installation, live model evaluation, premium consultation or publication was authorized.

Observed after initial frozen delivery:

- Real `nplus1_smoke.py --json`: exit 0, `status: pass`, eight controls. Focused Python suite: 10 tests passed in 0.025s. Independent implementation review still found missing high-child-count coverage, unstable literal-bearing trace fingerprints and unenforced fixture configuration bounds; correction is active. Initial green tests do not close these findings.
- Native `node --experimental-specifier-resolution=node --test scripts/outcome/schema.test.ts`: stopped before test execution with `ERR_MODULE_NOT_FOUND` for extensionless `./schema`. Node version 26.0.0. Existing dependencies will be reused for a separately labeled adapted-loader check if possible; no install or native full-audit success is claimed.
- Three changed skill eval JSON files and the eight-case held-out artifact parse successfully. Independent review found an incorrect asymptotic batching oracle, a literal negative assertion rejecting valid negation, and two broken canonical links. Their owners are correcting them. Structural parsing is not held-out reasoning proof.
- Prescribed browser preflight found `/opt/homebrew/bin/playwright-cli` version 0.1.8. Named browser session opened the retained baseline PNG, observed its loaded 2078×1614 dimensions and captured the baseline screenshot under `.playwright-cli/`; session closed. Candidate browser proof remains pending at this historical checkpoint.
- A separate Desktop invocation under OS network denial failed before export because nested sandbox initialization was not permitted. No PNG was produced; netlog was truncated. **Desktop network proof: NOT RUN — environment blocked.** This does not establish absent egress or an exporter defect. No sandbox bypass is used.
- Frozen documentation discovery check: all local Markdown links resolve across CONTRIBUTING, ADR and readiness assessment (three files). This does not establish runtime behavior.

Parent inspection and independent security review also require corrected ancestor permission/no-follow checks, same-snapshot canonical manifest binding, complete file writes, working manual theme controls and parsed-structure injection assertions. These are active implementation corrections, not cleared runtime controls. Final cumulative review and actual theme/package smoke follow freeze.

Evidence: [execution progress](../../artifacts/evidence/system-design-visualization-improvements/execution-progress.json), [Task 3–5 independent findings](../../artifacts/evidence/system-design-visualization-improvements/review-tasks-3-5.json), [Desktop environment failure](../../artifacts/evidence/system-design-visualization-improvements/desktop-network-observations.json).

Human paired-reader usefulness (AC-06), authorized held-out model judgments (AC-07…09) and release remain separate unexercised gates. No whole-feature `verified` claim is made.

## 10. Integrated implementation checkpoint

The maintainer subsequently approved the document-trace parser extension and retained Subagent-Driven execution after a delivery-worker quota interruption. Source IDs remain unchanged. The earlier design and initial-delivery observations above are historical; they are not current failing checks.

### Executed checks

- **207 diagram/exporter Python tests PASS** in 0.142s, including all eight root fixtures. The eight goldens were intentionally regenerated only after independent source closure and actual image inspection, then verified with the update flag disabled. Behavioral assertions were retained.
- **16 exact-final-source Desktop exports PASS:** eight diagram types × light/dark; input immutability and semantic text/ID/direction consistency checked. **Six adverse exports PASS:** long sequence participants/messages with source-to-output provenance, long ERD headers/types/columns, and long title/scope/seven-field view/group/hub cases. Actual images were inspected; conservative font metrics are not an arbitrary-input fit guarantee.
- **Offline context and adversarial-metadata browser checks PASS:** both embedded PNGs load with networking disabled; manual and system theme selection work; full digest remains visible with document width equal to the 1440px viewport. No baseline HTTP attempts or executable metadata structure occurred. Separately intercepted script/image/connect probes produced CSP violations without execution or successful HTTP responses. Both named browser sessions were closed.
- **Real SQLite fixture:** 12 tests PASS and CLI 11 observations/11 controls PASS. At 10 and 50 parents, baseline counts are 11/51 versus two batched SELECTs with independent result checks. A 250-child relation uses two SELECTs; an aggregate returns count 250 in one SELECT without materializing children. Reported bytes are serialized UTF-8 JSON, not wire bytes or PostgreSQL capacity evidence.
- **Trace compatibility:** 37 outcome tests and 68 document-trace tests PASS using Node 26 and an explicitly adapted loader reusing existing dependencies. The exact required feature audit reports no document-link issues; execution evidence is `not_evaluated`. Formal and historical-source authorities remain separate, including ambiguity and orphan coverage. Native pnpm/tsx execution is not inferred.
- Independent final review closed the approved source-and-documentation scope with no unresolved material finding; see [final delivery review](../../artifacts/evidence/system-design-visualization-improvements/final-delivery-review.json). This is qualified review closure, not human acceptance or release approval.

### Acceptance disposition

| Criterion | Current evidence / disposition |
| --- | --- |
| Evidence for AC-01 | Semantic/provenance, manifest binding, manual-edit protection and regenerated fixtures exercised; scoped source review closed. |
| Evidence for AC-02 | Actual representative long-text/route/boundary exports inspected; strict findings are not waived. |
| Evidence for AC-03 | Both themes exported; inspected vendor artwork and supported/uncertain labels retained; terminal symbols visibly distinct. Declared XML contrast observations are not a pixel-level audit or universal glyph-fit claim. |
| Evidence for AC-04 | Exact-final-source local-browser consumer smoke passed, including literal hostile-looking metadata and separately observed CSP enforcement. |
| Evidence for AC-05 | Success/error/prerequisite/publication behavior is covered by focused checks and truthful delivery guidance; no machine result is presented as human usefulness or live model efficacy. |
| Evidence for AC-06 | **NOT RUN:** maintainer paired-reader usefulness exercise and its approved correctness/time targets. |
| Evidence for AC-07 | Guidance and reviewed held-out cases delivered; **NOT RUN:** authorized fixed-model recognition judgments. |
| Evidence for AC-08 | Bounded-remedy guidance and constraints delivered; **NOT RUN:** authorized fixed-model remedy judgments. |
| Evidence for AC-09 | Real SQLite runtime portion passed; **NOT RUN:** required held-out skill-judgment portion. B1 acceptance remains pending. |

### Explicit remaining gates

**Technical verification remains qualified/blocked, not whole-feature PASS.** Desktop denied-network verification is environment-blocked; ordinary Desktop export and browser CSP do not prove Desktop egress enforcement. Eval preflight lacks `gpt-tokenizer`, and native workspace pnpm/tsx prerequisites were not installed. Build/lint/formatter checks were not run. Human-reader acceptance, live model efficacy, generated-consumer parity and release/publication remain unassessed or unauthorized. No sandbox bypass, package installation, version bump, commit or publication is implied.

Current receipts: [renderer and browser proof](../../artifacts/evidence/system-design-visualization-improvements/renderer-final-proof.json), [trace proof](../../artifacts/evidence/system-design-visualization-improvements/trace-final-proof.json), and [proposed retrospective candidates](../../artifacts/evidence/system-design-visualization-improvements/retrospective-candidates.json). Raw observations and export receipts are retained. The [archive and cleanup receipt](../../artifacts/evidence/system-design-visualization-improvements/archive-cleanup-receipt.json) records 312 checksum-verified copies and subsequent removal of 17 operation-owned temporary probes; their source remains non-executable archival evidence.

## 11. PR pipeline repair and native prerequisite checkpoint

PR [#298](https://github.com/HoangNguyen0403/agent-skills-standard/pull/298) exposed stale generated registry outputs in its generation drift check; the other reported original checks passed. The repair uses the supported isolated coordinator and historical producer ownership proof, not relaxed CI checks.

The maintainer subsequently authorized locked dependency restoration. Native `pnpm` execution now passes 37 outcome tests, 68 trace tests, 456 evaluation-script tests, required trace and run-record audits, CLI build, and workspace lint checks. Changed root TypeScript formatting was repaired with the existing Prettier configuration and verified after freeze. Evaluation preflight for the four changed skills reports zero issues. Local runtime is Node 26.0.0/pnpm 10.0.0; this is native execution, not a supported-LTS claim or the earlier adapted loader.

The nonmutating workspace format check still reports 14 unchanged website files; those are not silently rewritten as part of this repair. CLI validation auto-discovery selected zero skill bodies at committed HEAD, so its successful category-metadata check is not claimed as feature skill-body coverage. Exact observations and remaining repair gates are in [the native checkpoint](../../artifacts/evidence/system-design-visualization-improvements/ci-native-checkpoint.json). Human-reader acceptance, live model judgments, Desktop network enforcement and release remain separately unclosed.

Post-freeze `pnpm generate-indices --check` and `pnpm docs:capabilities:check` both passed. The configured `.claude` consumer ran all 207 diagram/exporter tests successfully, then performed a strict dark-component render and actual Desktop PNG export; [consumer image](../../artifacts/evidence/system-design-visualization-improvements/consumer-smoke.png). Independent repair review found no blocker or major finding in the formatting-only TypeScript delta or the four canonical/120 mirrored generated outputs. Fresh-clone PR checks remain the remote pipeline gate; local ownership state alone is not CI proof.

After the first CI repair, the unscoped Trace Audit exposed an activation side effect: this feature adds the repository's first `docs/brd/` and `docs/prd/` directories, ending the audit's fail-open state while two older SRS files cited PRD/BRD sources deleted in `ff9ad7342`. At the maintainer's direction to repair the legacy references, the last committed versions of those cited sources (`ff9ad7342^`) were restored byte-for-byte: `docs/brd/brd-evidence-led-marketing.md`, `docs/prd/prd-evidence-led-marketing.md`, and `docs/prd/prd-sync-reliability-and-attribution.md`. No requirement IDs were invented or renumbered. The unscoped audit then exits 0 with 12 existing non-strict `unlinked-req` warnings for the sync slug; this is document-link evidence only. The restoration reverses part of that earlier deletion and can be dropped only together with a decision to scope or exempt the audit.
