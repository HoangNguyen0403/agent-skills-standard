# Feature Plan: Measurement Validity First Slice (SL1 + SL3)

slug: ags-improvement-criteria
operator_profile: hybrid
lane: both
snc_tier: high (programme); medium per slice
delivery_mode: standard
approval: approved(requesting maintainer, 2026-11-11); execution: Subagent-Driven, selected by maintainer
source: `docs/brd/brd-ags-improvement-criteria.md`, inspected at `28140c6a09cc429148af67edd254f57de0958dac`
account domain: Personal (maintainer decision, 2026-11-11)

## Decision Brief

- **Changes since approved revision:** none to scope. Grounding found that both slices extend existing tooling, so no new subsystem is needed.
- **Recommendation:** approve two worker slices. SL1 makes the remediation queue separate assertion defects from skill defects. SL3 turns the learning log into a ledger with an integrity check.
- **Impact if wrong:** SL1 could label valid assertions as brittle and hide real skill gaps. The reviewer's hand-checked sample is the control.
- **Evidence and limitations:** `classifyFailure` never consults task anchoring (confirmed, `scripts/evals/quality.ts:592-609`). `isAssertionTaskAnchored` already exists and gates paid runs (confirmed, `scripts/evals/quality.ts:270-283`, `scripts/evals/index.ts:85-87`). The learning-log parser reads only date, task, signal and skills (confirmed, `scripts/freshness/signals/learning-log.ts`). Not verified: that run `all-v2.6.0` loads through `buildRemediationQueue`; `node_modules` is absent, so nothing was executed.
- **Execution decision:** Subagent-Driven selected; the maintainer authorized SL1 + SL3 implementation with “start process it”.
- **Authority:** bounded repository implementation and verification only; no paid evals, merge, release or activation.
- **Independently ready slices:** SL1 and SL3, once dependencies are installed.

## Outcome And Guardrails

- **Outcome:** criterion Q5 (assertion validity) and criteria R3/R4 (learning-loop closure and verification) get measured values from deterministic commands.
- **Guardrails:** no model calls or eval reruns; no edits to any `SKILL.md` or `evals.json`; no edits to past `AGENTS_LEARNING.md` entries; the tracked `benchmarks/evals/remediation-queue.json` keeps its current content; `pnpm freshness:audit` and `pnpm evals:preflight` keep their current exit behaviour.

## Scope And Non-Goals

- **Scope fence:** `scripts/evals/quality.ts` and its test; `scripts/freshness/` learning-log signal, a ledger CLI and tests; one generated triage file; `package.json` scripts, CI step, `docs/EVALS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`.
- **In scope:** classify failed assertions by task anchoring; emit a triage file for run `all-v2.6.0`; parse candidate fields from the learning log; print a ledger; fail a check on promotion without proof.
- **Non-goals:** repairing assertions (SL2); remediating skills (SL4); fresh eval runs (SL8); retrospective engine changes (SL6); promoting or rejecting any learning candidate; changing the log entry format.

## Requirements And Acceptance Criteria

Product owner: requesting maintainer. Engineering owner: assigned worker per slice. QA owner: independent reviewer on the Personal review profile.

| Req ID | Requirement | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-001 | The remediation queue classifies a failed `contains`/`contains_any` assertion that is not grounded in its case prompt or expected output as `invalid/brittle assertion` | SL1 worker | P0 | implemented; locally verified and independently reviewed |
| REQ-002 | The queue command can write to a caller-chosen file without touching the tracked queue | SL1 worker | P0 | implemented; real CLI smoke verified |
| REQ-003 | A committed triage file covers every failed assertion in run `all-v2.6.0`, with counts by classification | SL1 worker | P0 | generated; 1,456 rows independently reproduced |
| REQ-004 | A ledger command lists each learning candidate with its current status, mechanism, verification, review and age | SL3 worker | P0 | implemented; initial occurrence-count error reconciled below |
| REQ-005 | A check fails when a candidate has advanced beyond `proposed` without a mechanism, a verification reference and a review reference | SL3 worker | P0 | implemented; per-occurrence checks and real CLI negative smoke verified |
| REQ-006 | The check runs in CI and passes on the current log | SL3 worker | P1 | CI step added; local PASS; remote CI NOT RUN |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | A failed `contains` value absent from the case prompt and expected output but present in `SKILL.md` | the queue is built | the item is `invalid/brittle assertion`, not `guidance present but insufficiently actionable` | SL1 worker | unit test, `pnpm test:evals` |
| AC-002 | REQ-001 | A failed `contains` value present in the case prompt or expected output | the queue is built | the item keeps the existing present/missing classification | SL1 worker | unit test |
| AC-003 | REQ-001 | A compromised arm, a trigger-marker failure, or a `file_reference` failure | the queue is built | the existing classification and precedence are unchanged | SL1 worker | unit test |
| AC-004 | REQ-002 | `--out <file>` is passed | `pnpm evals:queue` runs | only that file is written; without the flag the default path is used as before | SL1 worker | unit test plus command run |
| AC-005 | REQ-003 | run `all-v2.6.0` | the queue runs with `--out benchmarks/evals/assertion-triage-all-v2.6.0.json` | the file exists, its item count equals the run's failed-assertion count, and the console prints counts per classification | SL1 worker | command output |
| AC-006 | REQ-003 | 20 triage items drawn across classifications (sample size assumed) | the reviewer checks each against the eval case by hand | every disagreement is listed; any systematic misclassification returns the slice | reviewer | independent review |
| AC-007 | REQ-004 | the current `AGENTS_LEARNING.md` | the ledger command runs | it lists 22 candidates, all `proposed`, and reports how many lack a mechanism and how many record no evaluation | SL3 worker | command output |
| AC-008 | REQ-004 | two entries naming the same candidate with different statuses | the ledger is built | the later entry's status is the current one and both iterations are listed as occurrences | SL3 worker | unit test, `pnpm test:freshness` |
| AC-009 | REQ-005 | a fixture candidate with status `promoted` and `Verification: pending` or `Review: pending` or no `Prevention` | the check runs | exit code is 1 and the candidate is named | SL3 worker | unit test |
| AC-010 | REQ-005 | a fixture candidate with an unknown status word | the check runs | exit code is 1 | SL3 worker | unit test |
| AC-011 | REQ-006 | the current log | the check runs locally and in CI | exit code is 0 and the freshness audit output is unchanged | SL3 worker | command output, CI run |

## Open Consequential Decisions

| Decision | Owner | Affected slice | Required input |
| --- | --- | --- | --- |
| Execution approach | requesting maintainer | SL1, SL3 | settled: Subagent-Driven; implementation authorized |

## Implementation Plan, Task Slices And Verification Plan

Both slices are routed independently: SNC medium, guided, TDD, deep review. Profile: "Personal - Cheap" (`google-antigravity/gemini-3.8-flash`, mode `write`, thinking `medium`). Exhaustion and quality-failure routing follow the session policy and each profile's eligibility restrictions; one concrete corrective attempt precedes quality escalation. Review: "Personal · Analysis & Review", separate from implementation ownership.

### P0: prerequisite (typed exception: prerequisite)

Each worker runs `rtk pnpm install` in its own worktree before anything else. `node_modules` is absent in this checkout. Consumer: every verification command below. If install fails, the worker reports the error and stops.

### Task 1 — SL1: assertion-validity triage

- **SNC:** S=1 N=1 C=1 total=3 tier=medium. Estimate: S, confidence medium.
- **Trace:** REQ-001, REQ-002, REQ-003, AC-001, AC-002, AC-003, AC-004, AC-005, AC-006. Criterion Q5.
- **Owned files:** `scripts/evals/quality.ts`, `scripts/evals/quality.test.ts`, `benchmarks/evals/assertion-triage-all-v2.6.0.json` (generated), `docs/EVALS.md` (queue section), one `CHANGELOG.md` bullet under `[Unreleased]`.
- **Scope:** only the SL1 owned files above.
- **Inputs:** this approved plan; retained all-v2.6.0 inputs, scores and answers; existing queue and task-anchoring helper.
- **Outputs:** corrected queue classification, selectable output path, tests, triage evidence and documentation.
- **Real Ingress:** the existing `evals:queue` CLI over retained run inputs.
- **Invariants:** classification precedence and historical evidence remain intact.
- **Positive invariant:** task-unanchored failed lexical assertions are flagged brittle.
- **Negative invariant:** no skill/eval source changes, paid runs, or overwriting the tracked remediation queue.
- **Verification Owner:** SL1 implementer for focused tests; orchestrator for integrated smoke; independent reviewer for AC-006.
- **Handoff / freeze:** final report freezes owned writes and supplies changed paths, verification output and remaining risks.
- **Correction Route:** one concrete AC corrective follow-up; then next eligible implementation profile on quality failure.
- **Steps:**
  1. Write failing tests for AC-001, AC-002, AC-003, AC-004 against `buildRemediationQueue` with a temp run directory fixture.
  2. In `buildRemediationQueue`, look up the eval case for each failed score and pass its prompt and expected output into classification. Match the failure to the assertion object from the eval definition rather than re-parsing the failure string, because `contains_any` values contain commas.
  3. Classification precedence: compromised, trigger-boundary, brittle (`file_reference`, `Priority:`, or not task-anchored via `isAssertionTaskAnchored`), then present or missing.
  4. Add `--out <file>` to the `queue` action and print counts per classification.
  5. Generate the triage file and update `docs/EVALS.md`.
- **Verification:** `rtk pnpm test:evals`; `rtk pnpm evals:queue -- --run all-v2.6.0 --out benchmarks/evals/assertion-triage-all-v2.6.0.json`; `rtk git status --short` shows `remediation-queue.json` unmodified.
- **Decision boundary:** if run `all-v2.6.0` does not load, or the eval definition for a case cannot be resolved from the run's inputs snapshot or `evals.json`, report the evidence and stop that step. Do not substitute another run.
- **Builder decisions delegated:** fixture layout; exact console format.

### Task 2 — SL3: learning-item ledger and check

- **SNC:** S=1 N=2 C=0 total=3 tier=medium. Estimate: M, confidence medium.
- **Trace:** REQ-004, REQ-005, REQ-006, AC-007, AC-008, AC-009, AC-010, AC-011. Criteria R3, R4.
- **Owned files:** `scripts/freshness/signals/learning-log.ts` and its test, new `scripts/freshness/learning-ledger.ts` and test, `package.json` (two script lines), `.github/workflows/ci.yml` (one step after the freshness audit), `CONTRIBUTING.md` (command list), one `CHANGELOG.md` bullet.
- **Scope:** only the SL3 owned files above.
- **Inputs:** this approved plan; append-only learning log; existing parser and log-format reference.
- **Outputs:** ledger builder, CLI, integrity check, behavioral tests, CI command and contributor documentation.
- **Real Ingress:** `learning:ledger` and `learning:check` over the repository learning log.
- **Invariants:** historical entries are read-only; freshness signal behavior remains unchanged.
- **Positive invariant:** latest candidate state and all occurrences are visible; missing proof prevents advancing status from passing the check.
- **Negative invariant:** no inferred human approval, automatic promotion, log rewriting or retrospective privacy changes.
- **Verification Owner:** SL3 implementer for focused tests; orchestrator for integrated smoke; independent reviewer for acceptance.
- **Handoff / freeze:** final report freezes owned writes and supplies changed paths, verification output and remaining risks.
- **Correction Route:** one concrete AC corrective follow-up; then next eligible implementation profile on quality failure.
- **Steps:**
  1. Write failing tests for AC-008, AC-009, AC-010 with inline log fixtures.
  2. Extend `LearningLogEntry` with optional `candidate`, `status`, `improvement`, `prevention`, `verification`, `evaluation`, `review`, parsed from the lines defined in `skills/common/common-learning-log/references/log-format.md`. Existing fields and `learningLogIssues` behaviour stay unchanged.
  3. Add a pure ledger builder: one row per candidate id, current status from the latest iteration, occurrences, age in days from the first occurrence.
  4. Add the check: fail on a status outside the format's list, and on any status other than `proposed` or `rejected` that lacks `Prevention`, a non-`pending` `Verification`, or a non-`pending` `Review`. Entries with no candidate line are counted as legacy and never fail.
  5. Add `learning:ledger` (table, `--json`) and `learning:check` scripts, the CI step and the docs line.
- **Verification:** `rtk pnpm test:freshness`; `rtk pnpm learning:ledger`; `rtk pnpm learning:check` exits 0; `rtk pnpm freshness:audit` output matches the pre-change output.
- **Decision boundary:** no edits to `AGENTS_LEARNING.md`. If the 22-candidate count does not reproduce, report the parsed list instead of adjusting the rule.
- **Builder decisions delegated:** table layout; issue wording.

### Integration and review

- Separate worktrees, one branch per slice; workers do not commit. Orchestrator integrates only owned changes. SL1 owns the CHANGELOG write and includes SL3's supplied bullet, avoiding shared writers.
- Worker report: changed files, AC results with command output, unverified areas.
- Orchestrator: rerun each verification command on the integrated tree, record the Q5, R3 and R4 values in the brief's criteria tables, then send both diffs to the reviewer with AC-006 as an explicit task.
- Defective output: one corrective follow-up naming the failed ACs, then escalate that slice to the next eligible route.

## Status And Receipt

- `feature_status`: implemented; local verification and independent technical review complete. Remote CI and human acceptance remain unassessed.
- Delivery evidence: `artifacts/ags-improvement-criteria/evidence/delivery.json`; independent findings and 20-row adjudication: `artifacts/ags-improvement-criteria/evidence/review.json`. Initial/corrected cumulative review packages remain retained locally under `.agent/`.
- Original RED: NOT RUN. No paid evals, model reruns, merge, release or activation performed.

## References

- `docs/brd/brd-ags-improvement-criteria.md` (approved 2026-11-11)
- `docs/brd/brd-skill-system-effectiveness.md` (approved 2026-11-05; unchanged)
- `docs/EVALS.md`, `CONTRIBUTING.md:193-230`, `.github/workflows/ci.yml:188-206`

## Next Workflow

- Local implementation, smoke verification and independent review are complete. Remote CI is the remaining unexecuted check; no merge, release, paid eval or subsequent remediation slice is authorized by this delivery.

## Verified Delivery And Measurement Corrections

- Integrated `pnpm test:evals`: **831 pass, 0 fail**; `pnpm test:freshness`: **71 pass, 0 fail**. Focused strict TypeScript check over changed scripts and tests: exit 0.
- Real CLI smoke covers advanced status with pending proof, fenced status substitution, earlier unsupported promotion followed by a proposed recurrence, valid proposed status, and unknown status; all five return the expected exit code.
- Retained `all-v2.6.0` triage reproduces all **1,456** failed assertions: 241 brittle, 8 missing guidance, 1,096 present-but-insufficient guidance, 111 trigger collisions. The other two classification buckets are zero.
- Q5 is still a **heuristic signal**, not semantic validity. With-skill flags are **85/525**; within the 32 weak skills they are **39/146**. No skill guidance or grader was repaired in this slice.
- AC-007 planning correction: **22 candidate-bearing entries are not 22 unique candidates**. Three repeated IDs yield **19 unique candidates**, all proposed, plus 4 legacy entries. The ledger correctly follows the approved deduplication requirement. It reports 18 without a concrete mechanism and 16 without a concrete evaluation reference.
- AC-006: independent reviewer preserved and adjudicated 20 row indexes across the four nonempty classifications. One new pressure-anchoring disagreement was corrected. Two inherited regex-classification disagreements remain explicitly documented; exact-token and historical trigger-oracle caveats prevent treating heuristic counts as demonstrated skill defects.
- AC-011: the CI step is statically present and the local command passes; **remote CI NOT RUN**, not PASS. Freshness audit remains the same 30 existing findings (22 medium, 8 low).
- Protected learning log, tracked remediation queue, retained run inputs and retained results have exactly their original SHA-256 hashes.
- Independent reviewer `8bb43b31-5de4-4c41-9c2f-6d69f4d8e057`: **APPROVE — bounded technical implementation**, after correcting fenced metadata handling, lost subheading skill extraction, historical proof validation, and pressure-assertion anchoring. This is technical review, not human acceptance or merge approval.

## SL2 — Confirmed Canonical Assertion Repairs

Authority: maintainer replied “yes please do next” to the recommendation to repair independently confirmed assertion defects. The existing Subagent-Driven approach and Personal profile routing remain selected. Base: `1b0302db138225f30e70cd0ea42702791cf5dc8c`.

Discovery distinguishes retained-run defects from current source. `hoist`, `PATCH`, `200` and `graph LR` assertions are already absent from canonical definitions; their frozen inputs and results must not change. Four canonical Android cases retain the independently identified lexical defects. Read-only real-scorer probes additionally confirmed current Common defects: a valid `/products` collection paraphrase fails eval 2, recommending `POST /cancelOrder` passes eval 3, and choosing a C4 component diagram passes the executive context case.

Outcome: seven current cases discriminate compliant alternatives from the concrete wrong behaviors required by their existing prompts/expected outputs. No new domain obligations, skill-body changes, scorer changes, live model calls, historical reruns or release.

| ID | Acceptance criterion | Owner | Verification lane |
| --- | --- | --- | --- |
| AC-012 | Each of the seven named cases accepts two independently reviewable compliant variants, including a paraphrase or equivalent implementation without the defective exact token | respective worker | real `checkAssertion` calibration |
| AC-013 | Each case rejects an answer missing a required behavior and an affirmative wrong/contradictory answer, including a keyword-rich wrong answer; at least two independent task-grounded assertions remain | respective worker | real-scorer controls and independent review |
| AC-014 | Untouched case objects, trigger definitions, pressure scenarios, skill bodies, scorer and retained run evidence remain byte-identical or structurally identical at the permitted case boundary | respective worker; integrator | hash/object comparison |
| AC-015 | Calibration packets record case IDs, original/candidate definition hashes, actual candidate texts, expected outcomes and failed assertion IDs, with semantics version and lexical limitations | respective worker | reproducible offline harness |
| AC-016 | Selected-case preflight, eval suite and check-alignment run; prior unrelated legacy debt is recorded rather than repaired; generators publish only expected metadata/version derivatives | integrator | offline commands and isolated-generation receipt |
| AC-017 | Independent reviewer re-adjudicates all safe/wrong controls, verifies no requirements were invented or weakened, and separates finite rubric discrimination from model efficacy | independent reviewer | bounded technical review |

Non-authoritative legacy-to-canonical ID mapping for archived SL2 evidence (`artifacts/ags-assertion-repair/evidence/**` retains the original IDs verbatim):

```text
SL2-AC-01 -> AC-012
SL2-AC-02 -> AC-013
SL2-AC-03 -> AC-014
SL2-AC-04 -> AC-015
SL2-AC-05 -> AC-016
SL2-AC-06 -> AC-017
(range: SL2-AC-01..06 -> AC-012..017)
```

### Task 3 — SL2 Android

- **Trace:** AC-012, AC-013, AC-014, AC-015 (worker calibration, boundary preservation, and packet receipts; feeds integrator AC-016 and independent review AC-017).
- **Scope:** `skills/android/android-testing/evals/evals.json` eval 1; `android-architecture/evals/evals.json` eval 1; `android-compose-migration/evals/evals.json` eval 1; `android-concurrency/evals/evals.json` eval 2 (all under `skills/android/`). Also `scripts/evals/sl2-android-discriminators.test.ts` and `artifacts/ags-assertion-repair/evidence/android-controls.json`.
- **Inputs:** current canonical case prompts/expected outputs, prior reviewer rows 1/8/10/90 and immutable scorer semantics; this plan.
- **Outputs:** four case-local repairs, offline real-scorer discriminator tests and evidence packet.
- **Real Ingress:** unchanged `checkAssertion` scoring each canonical case's assertions; eval suite discovers the new discriminator tests.
- **Invariants:** no requirement reduction to make a candidate pass; prompt rewording may clarify existing semantics but cannot force arbitrary answer vocabulary.
- **Positive invariant:** fake-based deterministic tests, “use case” business-layer terminology, migration target selection without “candidate”, and injected dispatcher abstractions with different names can pass when their required behavior is present.
- **Negative invariant:** hardcoded dispatchers, business logic in ViewModels, unbounded migration suggestions, and nondeterministic tests do not pass solely by echoing keywords.
- **Verification Owner:** worker runs focused offline harness and selected preflight after implementation; orchestrator runs integrated suite; independent reviewer adjudicates controls.
- **Handoff / freeze:** final report freezes owned writes and provides changed files, original/candidate hashes, AC results, command outputs and explicit limits.
- **Correction Route:** one bounded corrective follow-up; then next eligible implementation profile on a second quality failure.

SNC S=1 N=1 C=1 total=3 medium. Implement on Personal - Cheap. Do not edit `android-compose`, metadata, changelog, mirrors or prior evidence. Minimum controls per case: two safe and two wrong; additional controls only for distinct ambiguity. Use the real scorer, never a copied matcher or changed scorer. Tests must assert decision outcomes, not source strings or wiring. Preserve IDs where possible and keep unrelated assertions unless they reproduce the same confirmed defect. No mid-flight build/test/formatter runs; one consolidated verification after authoring; original test RED is NOT RUN unless actually observed. Retained answer replay is diagnostic evidence, not a fresh model run.

### Task 4 — SL2 Common

- **Trace:** AC-012, AC-013, AC-014, AC-015 (worker calibration, boundary preservation, and packet receipts; feeds integrator AC-016 and independent review AC-017).
- **Scope:** `skills/common/common-api-design/evals/evals.json` evals 2 and 3; `skills/common/common-architecture-diagramming/evals/evals.json` eval 1. Also `scripts/evals/sl2-common-discriminators.test.ts`, `artifacts/ags-assertion-repair/evidence/common-controls.json`, `skills/metadata.json` (android/common patch versions and dates only), `CHANGELOG.md` (one scoped unreleased entry).
- **Inputs:** existing canonical prompts/expected outputs; prior review and the three new real-scorer probes; this plan.
- **Outputs:** three case-local repairs, offline discriminator tests and evidence packet; metadata bumps android 1.5.2→1.5.3 and common 2.9.7→2.9.8, dated 2026-11-11.
- **Real Ingress:** unchanged `checkAssertion` scoring canonical definitions; offline test suite.
- **Invariants:** API checks retain plural resource naming and action-subresource semantics; diagram checks require the executive system-context abstraction and its existing scope/relationship metadata.
- **Positive invariant:** collection names other than `/orders`, valid action subresources, and system-context paraphrases can pass without historical PATCH/200/Mermaid syntax requirements.
- **Negative invariant:** verb-style `/cancelOrder` routes, singular resource naming, and component-level executive scope advice cannot pass by listing good keywords elsewhere.
- **Verification Owner:** worker for focused offline calibration; orchestrator for integrated suite/generation; independent reviewer for control adjudication.
- **Handoff / freeze:** final report freezes owned source writes and supplies hashes, AC results, command output and remaining lexical limits.
- **Correction Route:** one bounded corrective follow-up; then next eligible implementation profile on a second quality failure.

SNC S=1 N=1 C=1 total=3 medium. Implement on Personal - Cheap. Do not restore stale historical assertions or edit any skill body/scorer/retained run. Same four-control minimum and verification discipline as Task 3. Metadata/changelog have this single owner. Do not run generators until both source slices have integrated and the orchestrator issues the source-freeze handoff.

### SL2 Integration

Integrate only owned cumulative patches from the shared base. Common owner performs the existing isolated `generate-indices` lifecycle after a separate source-freeze handoff; no hand edits to generated outputs or active ownership lock. Evals are excluded from mirror resource allowlists (`scripts/generate-indices.ts:41-47`, `scripts/generation/isolated-stage.ts:314-327`); metadata derivatives may still change. Preserve existing `.agent` evidence, execute current generator safety gates, and verify expected host/resource coverage rather than assume a successful generator proves parity. Archive versioned SL2 receipts under `artifacts/ags-assertion-repair/evidence/`. Remote CI, model efficacy and financial savings stay NOT RUN/unmeasured unless separately observed.

### SL2 Verified Delivery

- Local implementation and independent technical review are complete; remote CI, live-model evaluation, merge, release and human acceptance remain unassessed or unexecuted.
- Delivery record: `artifacts/ags-assertion-repair/evidence/delivery.json`; immutable control packets, candidate receipts and cumulative review packages are retained in the same evidence directory.
- AC-012, AC-013, AC-015, AC-017: independent reviewer `8bb43b31-5de4-4c41-9c2f-6d69f4d8e057` approved the bounded source and generation gate. Direct real-scorer replay matched **36/36 decisions** across semantics v1/v2: 14 original controls plus four supplemental counterexamples.
- Original-control trajectory: frozen predecessor **3/14**, first candidate **8/14**, corrected and final candidates **14/14**. Supplemental trajectory: first correction **0/8**, fallback **8/8** across both semantics. Disclosed controls are calibrated regression evidence, not held-out model efficacy.
- AC-014: all six skill bodies, untouched cases/triggers/pressure scenarios, scorer and protected historical inputs/results/queue remain unchanged. Only assertions in the seven approved cases changed.
- AC-016: integrated eval suite **909 pass, 0 fail**; focused strict TypeScript exit **0**; selected alignment/definition preflight **0 issues**. Overall alignment passes; four unrelated warnings remain.
- Isolated generation apply and check passed all three producer phases and canonical/host parity over **2,381 targets / four hosts**. Only the ignored `.skills-lock.json` was published by the existing guarded lifecycle; no tracked derivative content changed. Parent and reviewer verified **59 protected hashes** and **four archived generation copies**.
- The forwarded `pnpm generate-indices -- --check` usage failure is preserved separately from successful `pnpm generate-indices --check`. No generator or ownership-policy workaround was introduced.
- Cheap owners produced both initial slices and one corrective pass each. Remaining concrete polarity/scope defects were fixed by `Personal · Delivery`; `Personal - DeepSeek` was ineligible for this quality-only escalation under its exhaustion-only profile restriction. No premium advisor was used.
- Original worker TDD RED remains **NOT RUN**. Regex morphology, bounded negation and prose/dataflow limits remain documented; total monetary savings and production/model-quality uplift are **unmeasured**.
- Retrospective prevention proposal: judge safe-control completeness against canonical obligations before calibration; retain independent contradictory-clause and subject-scope controls. Passing authored tests alone did not establish acceptance. No automatic learning-log or policy promotion is authorized.
- Next workflow: remote CI and maintainer review of the local delivery. Further remediation, live evaluations, merge and release require their own authority.
