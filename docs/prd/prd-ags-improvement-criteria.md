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

Both slices are routed independently: SNC medium, guided, TDD, deep review. Profile: "Personal - Cheap" (`google-antigravity/gemini-3.8-flash`, mode `write`, thinking `medium`). Fallback on confirmed exhaustion only: "Personal - DeepSeek", then "Personal · Delivery". Review: "Personal · Analysis & Review", in a separate session from the implementer.

### P0: prerequisite (typed exception: prerequisite)

Each worker runs `rtk pnpm install` in its own worktree before anything else. `node_modules` is absent in this checkout. Consumer: every verification command below. If install fails, the worker reports the error and stops.

### Task 1 — SL1: assertion-validity triage

- **SNC:** S=1 N=1 C=1 total=3 tier=medium. Estimate: S, confidence medium.
- **Trace:** REQ-001..003, AC-001..006. Criterion Q5.
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
  1. Write failing tests for AC-001..004 against `buildRemediationQueue` with a temp run directory fixture.
  2. In `buildRemediationQueue`, look up the eval case for each failed score and pass its prompt and expected output into classification. Match the failure to the assertion object from the eval definition rather than re-parsing the failure string, because `contains_any` values contain commas.
  3. Classification precedence: compromised, trigger-boundary, brittle (`file_reference`, `Priority:`, or not task-anchored via `isAssertionTaskAnchored`), then present or missing.
  4. Add `--out <file>` to the `queue` action and print counts per classification.
  5. Generate the triage file and update `docs/EVALS.md`.
- **Verification:** `rtk pnpm test:evals`; `rtk pnpm evals:queue -- --run all-v2.6.0 --out benchmarks/evals/assertion-triage-all-v2.6.0.json`; `rtk git status --short` shows `remediation-queue.json` unmodified.
- **Decision boundary:** if run `all-v2.6.0` does not load, or the eval definition for a case cannot be resolved from the run's inputs snapshot or `evals.json`, report the evidence and stop that step. Do not substitute another run.
- **Builder decisions delegated:** fixture layout; exact console format.

### Task 2 — SL3: learning-item ledger and check

- **SNC:** S=1 N=2 C=0 total=3 tier=medium. Estimate: M, confidence medium.
- **Trace:** REQ-004..006, AC-007..011. Criteria R3, R4.
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
  1. Write failing tests for AC-008..010 with inline log fixtures.
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
