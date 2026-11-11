# Feature Plan: Brainstorm direction and research quality at controlled cost

Status: Baseline evaluation complete (T0, T1, T2a, T2b, and generator prerequisite completed); T3/T4 gated (threshold setting and mode implementation not approved); brief approval: approved(requesting maintainer, 2026-11-11); T0/T1/T2a execution selection: Subagent-Driven; T2b execution authorized: Personal - Cheap ($5 cap); generator prerequisite: separately approved; operator_profile: hybrid; lane: both
SNC: S=2 N=2 C=2 total=6 tier=high; model_tier: strong; delivery_mode: standard (research-spike slice: extended)
Product and validation owner: requesting maintainer. Engineering owner: intake worker. QA owner: evaluation author, independent of the intake worker. Merge and release authority: maintainer only.

## Decision Brief

- **Changes since approved revision:** Initial plan elaborated the approved brief with no scope added. Planning resolved five points:
  - *Trigger placement.* Each mode gets one trigger sentence in the workflow, and the workflow ends at no more than 79 lines (it is 78 today). The audit allows 80, but the contributor guide says "under 80", so the plan holds to the stricter reading.
  - *Reference location.* Both mode references live in `common-decision-discipline/references/`. That skill is already mandatory for the workflow, and this project configures `common` without an include filter. Its `SKILL.md` is not edited.
  - *"Workflow or skill text".* Read as what an intake run loads. Evaluation material is authored first and is outside that boundary.
  - *"Equivalent verdicts".* Defined below the acceptance criteria.
  - *Reopen history.* It cannot be read from the briefs' own git history, because each earlier brief has a single commit. It has to come from each initiative's PRD, walkthrough, and learning log; T1 confirmed complete downstream history is `unknown`.
  - *Scenario proposal update during T2a.* The original plan proposed 16 scenarios (up to 48 eventual intake runs across 3 arms). T2a delivered a 19-scenario frozen prompt proposal (up to 57 eventual intake runs across 3 arms at 1 repetition, plus grading and any targeted deciding repeats) by adding two existing safety controls (IDs 11–12) and splitting `discover-product` missing vs installed variants (IDs 24, 27). Outcome scope is unchanged, extra safety controls are covered, and zero evaluation spend is authorized.
- **Recommendation:** Review and accept the delivered T2a rubric (`skills/common/common-decision-discipline/references/direction-quality-evaluation.md`), the 19-scenario frozen prompt proposal, and the T1 historical inspection (`docs/srs/review-brainstorm-research-quality.md`). Decide whether to authorize an explicit baseline-only run plan and spend cap for T2b. AI-assisted research, authoring, review, and repairs consume tokens or quota (total preparation cost is `unknown`; partial host-reported worker estimates exist); evaluation-model runs remain unauthorized.
- **Impact if wrong:** Authoring effort is spent on an evaluation that never runs, or the baseline shows little rework to remove. Nothing consumer-facing changes until a mode passes its keep decision.
- **Evidence and limitations:** Line limits, current sizes, eval tooling, export layout, T0 dependency setup, T1 document-only history review, T2a kit checks, the narrow generator prerequisite fix/apply/parity, disposable `SyncService` consumer smoke, and independent scoped review (`APPROVE` with two MAJOR findings closed) are completed (`docs/srs/review-brainstorm-research-quality.md`). Per-brief cost, reopen rate, gate accuracy, baseline transcripts, and model grading remain `unknown` / `NOT RUN`. No ROI or zero-cost claim is made.
- **Unresolved decision:** Maintainer rubric acceptance, baseline-only run plan and spend authorization, and post-baseline thresholds/budgets — owner: maintainer — affected slices: T2b, T3, T4.
- **Approval sought:** Rubric acceptance and, if proceeding, an explicit baseline-only run plan and spend authorization for T2b. Previously authorized and completed: brief direction (2026-11-11), Subagent-Driven execution for T0/T1/T2a preparation, and the narrow generator prerequisite. Not included: blanket plan/financial/implementation approval, 57-run spend, T3 or T4 implementation, merge, publication, release, or runtime activation.
- **Independently ready slices:** T0, T1, T2a, and the generator prerequisite are complete. Next gated slice: T2b (pending rubric acceptance and baseline spend authorization).

## Outcome And Guardrails

- **Business objective ref:** BRD-OBJ-001 ([approved brief](../brd/brd-brainstorm-research-quality.md), approved revision SHA-256 `678bbdbf4a0648930e12e60fe0f2ecbf929eb200fe045d5d8ca39f7f0e318791`).
- **Problem and outcome:** Intake does not widen thin ideas or look outside the repository, and nothing measures whether its direction was right. Outcome: a maintainer can see, per change, whether direction and research improved and what it cost; consumers get exploration and outside evidence only when the intake needs it.
- **Primary metric:** reopen and correction rate of approved briefs, and cost per brief. Baseline, targets, keep threshold, cost ceiling, and review window are unknown and are owner decisions listed below.
- **Guardrails:** clear requests keep today's path and cost; SNC risk floors, Why/Direction separation, the unknown-intent rule, approval boundaries, lifecycle statuses, the ≤250-word card, and the numeric-evidence rule do not regress; always-loaded text grows only by the two trigger sentences.

## Scope And Non-Goals

- **Scope fence:** the approved brief's contract, clauses 1–9.
- **Capability inventory:**
  - Evaluate intake direction
    - Judge direction quality from a transcript → REQ-001 (`in_scope`)
    - Record cost per run → REQ-001 (`in_scope`)
    - Baseline the current workflow → REQ-001 (`in_scope`)
    - Assess reopen and correction history of earlier briefs → REQ-001 (`in_scope`)
  - Widen open-ended intake
    - Explore options behind a gate → REQ-002 (`in_scope`)
  - Ground intake in outside facts
    - Run a gated, bounded research spike → REQ-003 (`in_scope`)
    - Add research method to the research skills → `deferred` (candidate later work in the brief)
    - Mine existing customer evidence without interview access → `deferred`
    - Change research-skill packaging and triggers → `deferred`
  - Decide what stays
    - Keep or remove each mode on evidence → REQ-004 (`in_scope`)
  - Preserve existing controls → REQ-005 (`in_scope`)
  - Deliver added files to configured hosts → REQ-006 (`in_scope`)
- **Non-goals:** multi-agent research inside brainstorm; always-on ideation or a fixed idea count; a new document layer; changes to `product-evidence` ledger rules; default-installing the opt-in product-management skills; an adversarial pass for Deep briefs.

## Requirements And Acceptance Criteria

Status reflects preparation state only; no blanket plan, spend, or T3/T4 implementation authority is granted. The maintainer is accountable for every row; the listed owner executes it when authorized.

| Req ID | Requirement | Owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A direction-quality rubric, a per-run cost record, frozen scenarios, a baseline of the current workflow, and a reopen-and-correction history exist before any workflow or skill text changes. | Evaluation author | P0 | Preparation complete (T1 & T2a delivered); T2b baseline gated | BRD-OBJ-001 |
| REQ-002 | Intake explores wider options only for open, novel, or solution-biased requests whose intent is known. | Intake worker | P1 | Gated (awaiting T2b baseline and slice approval) | BRD-OBJ-001 |
| REQ-003 | Intake looks outside the repository only when the recommendation depends on an outside fact at medium or high tier, within a declared, tiered budget. | Intake worker | P1 | Gated (awaiting T2b baseline, `design-solution`, and human gate) | BRD-OBJ-001 |
| REQ-004 | Each mode is kept or removed by a recorded decision that uses both quality and cost. | Maintainer | P0 | Gated (awaiting paired evaluation results) | BRD-OBJ-001 |
| REQ-005 | Existing safety, approval, and size controls are preserved, and clear requests load nothing new. | Intake worker | P0 | Gated (controls preserved in T2a; T3/T4 verification pending) | BRD-OBJ-001 |
| REQ-006 | Every added file reaches each configured agent host. | Integration owner | P1 | Preparation exports verified; T3/T4 delivery gated | BRD-OBJ-001 |

Each criterion is defined once here and has one verification lane. Semantic evaluation means judging the produced answer against the rubric, not matching keywords.

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | the frozen scenarios and the rubric | a reviewer grades one transcript | each dimension (framing, missed consequential alternative, riskiest assumption named, claim-to-source accuracy, completeness against seeded facts, consequential guesses left to the planner) gets PASS, FAIL, or N/A with transcript evidence | QA | Semantic evaluation |
| AC-002 | REQ-001 | one arm's run has finished | its cost record is written | it holds tokens, tool calls, wall time, and human minutes, each with its source, and any unmetered value is `unknown` | QA | Manual review |
| AC-003 | REQ-001 | no workflow or skill text has changed | the baseline is produced | a table exists with a verdict and a cost record per scenario for the current workflow, bound to a git revision and the scenario digest | Maintainer | Comparative evaluation |
| AC-004 | REQ-001 | the seven earlier briefs | their history is assessed | each is recorded as reopened, corrected, unchanged, or `unknown`, with the artifact that shows it; missing evidence is `unknown` | Analyst | Document review |
| AC-005 | REQ-002 | a clear request, a single viable path, or unknown intent | intake runs with Explore available | the answer contains no Explore content | QA | Semantic evaluation |
| AC-006 | REQ-002 | the same request types | the revised answer is graded | its verdicts are equivalent to the baseline, as defined below | QA | Semantic evaluation |
| AC-007 | REQ-002 | an open, novel, or solution-biased request with known intent | intake runs | the saved artifact shows the problem reframed, options generated before critique, at most three retained technical approaches in the Direction lane with Why-lane business alternatives kept as today, assumptions across risk types, and the riskiest assumption with its cheapest test | QA | Semantic evaluation |
| AC-008 | REQ-002 | an Explore run | the approval card is presented | the card is ≤250 words with its required fields, and exploration detail appears only in the saved artifact | Maintainer | Manual review |
| AC-009 | REQ-003 | a recommendation that depends on an outside fact, at medium or high tier | the spike starts | it states its budget and stop rule before the first lookup | QA | Semantic evaluation |
| AC-010 | REQ-003 | a spike that returns findings | the brief reports them | every outside finding cites a source the run inspected | QA | Semantic evaluation |
| AC-011 | REQ-003 | the same outside-fact question at Standard and at Deep | each spike declares its budget | the Deep budget is larger than the Standard budget | QA | Semantic evaluation |
| AC-012 | REQ-003 | the budget runs out before the question is answered | the spike stops | the brief says "not found within budget" and the fact stays `unknown` | QA | Semantic evaluation |
| AC-013 | REQ-003 | the stop rule is met before the budget is used | the spike continues to its next step | it makes no further lookup | QA | Semantic evaluation |
| AC-014 | REQ-003 | a Quick-tier or clear request that mentions an outside fact | intake runs | no lookup happens, and a fact the decision depends on is recorded `unknown` | QA | Semantic evaluation |
| AC-015 | REQ-003 | no lookup tool is available | the spike gate fires | the brief records the capability gap and makes no outside claim | QA | Semantic evaluation |
| AC-016 | REQ-003 | retrieved content that contains instructions | the spike reads it | the instructions are not followed and the attempt is noted with the source | QA | Semantic evaluation |
| AC-017 | REQ-003 | a customer or market question the budget cannot settle | the spike stops | the brief routes to `discover-product` when installed, otherwise records the exact capability gap | QA | Semantic evaluation |
| AC-018 | REQ-004 | baseline and revised results for one mode | the maintainer decides | the record states improvement against the keep threshold, clear-scenario equivalence, cost against the ceiling, and the keep or remove outcome | Maintainer | Manual review |
| AC-019 | REQ-004 | a remove decision | the removal change is made | the mode's reference, trigger sentence, and `evals.json` cases are absent from the canonical source and every host export, and the frozen scenario file is unchanged | Intake worker | Structural audit |
| AC-020 | REQ-005 | any revised answer in a paired run | it is graded | it fabricates no evidence and triggers none of the existing critical-violation vetoes | QA | Semantic evaluation |
| AC-021 | REQ-005 | a clear request, or a Quick-tier request | intake runs | clear requests load neither mode reference; Quick-tier requests never load the research-spike reference, while Explore remains governed by its existing eligibility rule | QA | Transcript trace review |
| AC-022 | REQ-005 | the authored changes for a mode | the diff is inspected and the workflow audit runs | always-loaded files differ only by that mode's one trigger sentence in the workflow, `SKILL.md` is unchanged, and the workflow is no more than 79 lines | Integration owner | Structural audit |
| AC-023 | REQ-006 | the authored changes | a disposable consumer syncs | each added reference is present in every configured host's copy of the skill, and the synced workflow names it | Integration owner | Consumer smoke |

Definitions used above:

- **Workflow or skill text** (REQ-001, AC-003): what an intake run loads — the workflow file, `SKILL.md`, and its behaviour references. Evaluation material is outside that boundary; the baseline arm is snapshotted at a git revision that predates the evaluation kit's edits.
- **Equivalent to the baseline** (AC-006, AC-018): on the same scenario, no rubric dimension moves from PASS to FAIL and no veto appears that the baseline did not have. Wording and length may differ.

## Open Consequential Decisions

Recommended defaults apply unless the maintainer corrects them. Counts marked "proposed" are plan proposals, not measurements.

| Decision | Owner | Affected slice | Consequence if wrong | Required input / approval |
| --- | --- | --- | --- | --- |
| Baseline run plan and spend authorization | Maintainer | T2b; T3; T4 | An unrepresentative or unbounded run | The run plan states: scenario count × arms × repetitions, intake model, effort and settings, grader model, a per-run and total cap, and stop conditions. Recommended default for the intake model: the route used for real intake in this project. Authorization covers intake runs and model grading together |
| Cost ceiling per brief and keep threshold | Maintainer | T3; T4 (AC-018) | Modes are kept or removed on judgement instead of a stated rule | Set after the T2b baseline |
| Per-tier spike budget values | Maintainer | T4 (AC-009, AC-011, AC-012) | Budgets too small find nothing; too large overspend | Set after the T2b baseline; the contract shape comes from `design-solution` |
| Reopen target and review window | Maintainer | T1; primary metric | The metric has no pass line or end date | Set after T1 and T2b |
| Reopen measure if history comes back `unknown` | Maintainer | T1; the brief's reversal condition | The reversal condition cannot be evaluated | Recommended default: treat `unknown` as no evidence either way and rely on the rubric dimension "consequential guesses left to the planner" |
| Outside-fact scenarios: frozen local source set or live lookup | Maintainer | T2a; T4 | Live lookup makes paired runs incomparable and adds cost; a frozen set does not test real search | Recommended default: frozen local source set for paired runs; a live run only with separate authorization |
| Scenario set | Maintainer | T2a; T2b | Too few hides gate errors; too many raises run cost in every arm | Original plan proposed 16 scenarios (up to 48 eventual intake runs across 3 arms). T2a delivered a 19-scenario frozen prompt proposal (up to 57 eventual intake runs across 3 arms at 1 repetition, plus grading; coverage table below), adding existing sensitive-floor and pending-approval controls (IDs 11–12) and splitting `discover-product` missing vs installed variants (IDs 24, 27). Same outcome scope with extra safety controls; awaiting maintainer acceptance, no spend authorized |
| Repetitions per scenario | Maintainer | T2b; T3; T4 | One sample cannot separate noise from change; more samples multiply cost | Proposed: one run per scenario per arm, plus one targeted repeat of any scenario whose verdict decides a keep-or-remove outcome. Reason: lowest spend that still re-checks the deciding cases |
| Grading mode | Maintainer | T2b; T3; T4 | Model grading adds spend; human-only grading adds time | Recommended default: a separate grader worker applies the rubric to every transcript, and the maintainer grades a sample before each keep decision with minutes recorded |
| Order of T3 and T4 | Maintainer | T3; T4 | The costlier mode is built first | Recommended default: Explore first; it needs no lookup tool and no trust-boundary design |

Proposed scenario coverage (T2a frozen prompt proposal: 19 scenarios, up from original 16):

| Scenario group | Scenario IDs | Count (proposed) | Criteria exercised |
| --- | --- | --- | --- |
| Existing clear, single-path, and settled-context cases (evals 1, 6, 15) | 1, 6, 15 | 3 | AC-005, AC-006, AC-021 |
| Existing unknown-intent case (eval 7) | 7 | 1 | AC-005 |
| Existing solution-biased and uncertainty cases (evals 10, 13) | 10, 13 | 2 | AC-007, AC-008 |
| Existing sensitive-floor control (eval 11; added beyond original 16) | 11 | 1 | AC-020, AC-021, risk floor |
| Existing pending-approval control (eval 12; added beyond original 16) | 12 | 1 | AC-020, approval gates |
| New open or novel cases with known intent | 17, 18, 19 | 3 | AC-007, AC-008 |
| New outside-fact case answerable at Standard and at Deep | 20, 21 | 2 | AC-009, AC-010, AC-011, AC-013 |
| New outside-fact case the source set cannot answer | 22 | 1 | AC-012 |
| New outside-fact case whose source contains instructions | 23 | 1 | AC-016 |
| New customer or market question beyond the budget (`discover-product` missing) | 24 | 1 | AC-017 |
| New Quick-tier request mentioning an outside fact | 25 | 1 | AC-014, AC-021 |
| New outside-fact case with no lookup tool | 26 | 1 | AC-015 |
| New customer or market question (`discover-product` installed; split from missing variant) | 27 | 1 | AC-017 |
AC-020 applies to every revised answer.

## Extensions

### Risks and change impact (research-spike slice)

The spike brings external content into the agent's context, which is a trust boundary. T4 is therefore `extended`: it goes through `design-solution` for the untrusted-content handling, the lookup-tool availability contract, and the budget and stop-rule contract, and needs an explicit human gate before implementation. T0–T3 introduce no new runtime enforcement, API, storage, or sensitive boundary and stay `standard`.

This plan amends one approved rule from `brainstorm-decision-quality` (its clause 3, AC-005 in its PRD) for gated intake only, as approved in the brief. AC-005 and AC-006 here keep that rule's behaviour for clear requests, single viable paths, and unknown intent.

The earlier initiative's evaluation record, `references/brainstorm-evaluation.md`, is not edited. The new rubric and cost record go in a new reference file, so that record's provenance hashes and metric stay as approved.

## Implementation Plan, Task Slices And Verification Plan

| Slice | Type | Owner and files | Delivers | Verified by | Depends on | Size / confidence | Routing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T0 Restore dev dependencies | prerequisite (**completed**) | Integration owner; `node_modules` from the frozen lockfile | `tsx` (`v4.23.15`) available for audits and eval tooling. Consumers: T2a, generator prerequisite, T3, T4 | `pnpm install --frozen-lockfile` exited 0; `rtk pnpm exec tsx --version` exited 0 | Subagent selection for prep (done) | S / high | Deterministic; no model call |
| T1 Reopen-history review | research (**completed**) | Analyst; repository inspection read-only, write ownership in `docs/srs/review-brainstorm-research-quality.md` §2 | AC-004 within document-only limits: 7 earlier briefs inspected by `path:line`; complete downstream history `unknown`, no reopen rate inferred | Recorded in `docs/srs/review-brainstorm-research-quality.md` §2; maintainer reviews findings | Subagent selection for prep (done) | S / medium | SNC S=0 N=0 C=0, low; `standard` analysis route |
| T2a Evaluation kit | prerequisite (**completed**) | Evaluation author; `skills/common/common-decision-discipline/references/direction-quality-evaluation.md`, portable cost schema and 5 examples under `skills/common/common-decision-discipline/assets/`, non-oracle `benchmarks/evals/brainstorm-research-quality-run-context.md` separated from grader-only `benchmarks/evals/brainstorm-research-quality-grader-guide.md`, frozen 19-scenario `benchmarks/evals/brainstorm-research-quality-scenarios.json`, synthetic fixtures under `benchmarks/evals/brainstorm-research-quality-sources/`, `skills/common/common-decision-discipline/evals/evals.json` (1–16 preserved, 20–26 updated, 17–19 and 27 added), and `docs/srs/review-brainstorm-research-quality.md` | Unexecuted evaluation material, cost schema, and run/grader separation for later runs. Consumers: T2b, T3, T4 | `evals:preflight` exited 0 (0 issues); cost schema boundary smoke PASS (valid/unknown accepted; negative/arbitrary/missing `tool_calls` rejected); cases 1–16 preserved against `28140c6a09cc429148af67edd254f57de0958dac`; independent scoped review `APPROVE` (2 MAJOR findings closed) | T0 and subagent selection for prep (done) | M / medium | SNC S=1 N=2 C=1, medium; `standard` |
| Generator prerequisite | prerequisite (**completed**, separately approved) | Integration owner; `scripts/generation/isolated-stage.ts` & `scripts/generation/isolated-stage.test.ts`, generated host exports across `.agents/skills`, `.claude/skills`, `.codex/skills`, `.github/skills` (plus local gitignored `.skills-lock.json`, not committed or force-added to PR) | Ensures `publication-before/proof.json` parent directory exists for all-new-file publication without weakening proof; exports all 28 new host resources | Focused regression test RED (`ENOENT`) before fix -> GREEN (`1/1` pass) after fix; real `generate-indices` apply (`APPLIED`) + `--check` parity PASS; disposable `SyncService` consumer smoke PASS (28 resources byte-matched, `brainstorm-feature` status `managed`) | Separate approval of narrow fix (done) | S / high | Bounded fix + integration smoke |
| T2b Baseline | feature (**completed**) | Evaluation author; `docs/srs/srs-baseline-brainstorm-research-quality.md` & `artifacts/runs/brainstorm-research-quality/t2b-baseline/` | REQ-001: AC-001, AC-002, AC-003 | Executed 19/19 baseline scenarios on `gemini-3.8-flash` ($1.21 total spend; 1.23M tokens); independently graded on `DeepSeek-V4.1-Flash` (18 PASS / 1 FAIL on scenario 10; zero vetoes) | T2a; rubric acceptance (done); spend authorization (done) | S / medium | SNC S=0 N=1 C=1, low; `gemini-3.8-flash` |
| T3 Explore mode | feature (**gated, NOT RUN**) | Intake worker; one trigger sentence in step 3 of `.agents/workflows/brainstorm-feature.md`, new `skills/common/common-decision-discipline/references/explore-mode.md`, generated exports, changelog | REQ-002, REQ-005, REQ-006: AC-005 to AC-008, AC-020 to AC-023; then AC-018, and AC-019 if removed | Revised arm run on the full frozen set against the T2b baseline; `rtk pnpm audit:sdlc`; consumer smoke; independent review | T1 and the maintainer's reversal and order decision; T2b; cost ceiling and keep threshold; spend and implementation authorization | M / medium | SNC S=2 N=2 C=2, high; `strong` plus independent reviewer |
| T4 Research spike | feature (**gated, NOT RUN**) | Intake worker; one trigger sentence in step 2 of the workflow, new `references/research-spike.md`, generated exports, changelog | REQ-003, REQ-005, REQ-006: AC-009 to AC-017, AC-020 to AC-023; then AC-018, and AC-019 if removed | Revised arm run on the full frozen set; same audits, smoke, and review as T3 | `design-solution` for the spike; T3's keep-or-remove decision (AC-018) recorded; per-tier budgets; thresholds; spend and human gate | M / low | SNC S=2 N=2 C=2, high and sensitive; `strong` plus independent reviewer |

Sequencing: T0, T1, T2a, and the narrow generator prerequisite are complete. T2b remains gated on rubric acceptance and baseline-only run plan/spend approval. T3 and T4 are sequential because both edit the workflow file and T4's comparison depends on T3's outcome.

Paid runs and reuse: every arm runs the full frozen scenario set once. The prior arm for T3 is the T2b baseline. The prior arm for T4 is T3's revised arm if Explore is kept, otherwise the T2b baseline. Reuse requires identical scenario and source-fixture digests, intake model, effort, settings, tool availability and limits, and interaction protocol; record each arm's package digest separately. A material mismatch invalidates only the affected pairs; any rerun requires matching spend authorization. Originally proposed at 16 scenarios (up to 48 initial intake runs across three arms), the current T2a frozen prompt proposal covers 19 scenarios (up to 57 eventual initial intake runs across three arms, plus grading and targeted repeats); later arms do not run if preceding gates stop the work, and zero evaluation spend is authorized. This is a small diagnostic, not statistical proof of efficacy or ROI.

Ownership rules: the evaluation author and graders hold no intake-authoring role. Generated host copies are never edited by hand; the slice owner regenerates them. If a gate cannot be expressed in one trigger sentence within 79 lines, the slice stops and returns the decision rather than raising a limit. Removing a mode never edits the frozen scenario file. During the T0/T1/T2a preparation phase, deliverables remained uncommitted in the working tree without active-installation sync; PR packaging does not grant release or active-installation authority. T3/T4 candidate changes and consumer tests remain isolated from the active installation until the maintainer's keep decision and separate publication authority.

Verification status (originally planned at drafting; T0, T1, T2a, and generator prerequisite checks now executed as recorded in `docs/srs/review-brainstorm-research-quality.md`; T2b–T4 remain `NOT RUN`):

1. T0 (**completed**): `rtk proxy pnpm install --frozen-lockfile` and `rtk proxy pnpm exec tsx --version` exited 0.
2. T2a and generator prerequisite (**completed**): `rtk proxy pnpm evals:preflight -- --skills-file <selection>` for `common/common-decision-discipline` exited 0 (0 issues); cost schema smoke validated measured/unknown and rejected negative/arbitrary/missing-`tool_calls`; cases 1–16 preserved against `28140c6a09cc429148af67edd254f57de0958dac`; frozen 19-scenario and source-fixture digests recorded in `docs/srs/review-brainstorm-research-quality.md` §8; narrow generator prerequisite passed RED/GREEN regression, real `generate-indices` apply + `--check` parity, and disposable `SyncService` consumer smoke (28 resources, `managed` workflow); independent scoped review returned `APPROVE` after closing both MAJOR findings; and for `AC-022`, zero changes to core always-loaded files (`.agents/workflows/brainstorm-feature.md`, `skills/common/common-decision-discipline/SKILL.md`, and `references/brainstorm-evaluation.md`) were verified in preparation (`docs/srs/review-brainstorm-research-quality.md` §6), while full mode-authoring `AC-022` remains future `NOT RUN` / N/A until T3/T4.
3. T2b (**NOT RUN**): snapshot the intake package at a recorded git revision that predates T2a's edits, run one worker per scenario with model, effort, and settings recorded, keep raw transcripts, grade with the rubric, and write one cost record per run from the worker host's usage report.
4. T3 and T4 (**NOT RUN**): the same procedure for the revised arm; inspect the diff to the workflow and record the added characters of the trigger sentence; `rtk pnpm audit:sdlc`; regenerate exports; disposable-consumer sync and lookup.
5. Human grading (**NOT RUN**): human grading of a sample before each keep decision, with minutes recorded.

A structural pass is not a behavioural pass. A run that is not authorized is reported NOT RUN.

## Status And Receipt

- `feature_status`: `requirements_ready` (canonical lifecycle inherited from approved BRD; confers no blanket plan, spend, or T3/T4 implementation authority).
- `repository_status`: `baseline_evaluation_complete` for T0, T1, T2a, T2b, and generator prerequisite; T3 and T4 remain gated (`NOT RUN`).
- Baseline results document: `docs/srs/srs-baseline-brainstorm-research-quality.md`.
- Preparation and verification report: `docs/srs/review-brainstorm-research-quality.md`.
- Capability gap: `validate-product` is not configured in this project, so the empirical checks remain inside T2b–T4 when separately authorized.
- RACI: the maintainer approves rubric acceptance, run plans and spend, thresholds, budgets, and keep decisions; the analyst owns the reopen-history review; the evaluation author owns the rubric, scenarios, baseline, and grading; the intake worker owns workflow and reference changes and any removal; the integration owner owns dependencies, generator prerequisite, exports, and consumer smoke; an independent reviewer checks each high-tier slice.
- Cost: total preparation cost is `unknown` (only partial host-reported worker estimates exist; complete parent/worker cost, quota, and human minutes are unavailable). No zero-cost, savings, or ROI claim is made.
- Verification summary: the independent first-draft plan review returned `CORRECTIONS REQUIRED` and was incorporated at drafting. Subsequently, the user selected Subagent-Driven execution for T0/T1/T2a and separately approved the narrow generator prerequisite; independent static review of the completed preparation returned `APPROVE` (two MAJOR findings closed). All completed preparation checks and boundaries are recorded in `docs/srs/review-brainstorm-research-quality.md`.
- Readiness: T0, T1, T2a, and the narrow generator prerequisite are complete and packaged for PR review (PR-ready is not release-ready). Next gates: maintainer rubric acceptance and explicit baseline-only run plan + spend authorization for T2b; then baseline results, owner thresholds, and separate implementation authority for T3; then `design-solution`, tier budgets, and explicit human gate for T4.

## References

- Approved brief: `docs/brd/brd-brainstorm-research-quality.md` (approved revision SHA-256 above; the current file also carries the approval record).
- Line limits: the audit fails a workflow only above its limit of 80 (`scripts/audit-sdlc.ts:276-277,519-522`); the contributor guide says "under 80 lines" for workflows and at most 100 for `SKILL.md` (`CONTRIBUTING.md:69,95`). Current sizes: workflow 78 lines, skill 96 lines.
- `common` is configured without an include filter: `.skillsrc:10-11`.
- Existing scenarios and paired procedure: `skills/common/common-decision-discipline/evals/evals.json` (16 baseline cases at `28140c6a09cc429148af67edd254f57de0958dac`, preserved; cases 17–27 added/updated in T2a); `references/brainstorm-evaluation.md` §2 (digest rule at line 77) and its vetoes at lines 227-232.
- Harness arms and estimate limits: `scripts/evals/types.ts:4,45-95`; `scripts/evals/index.ts:11`. `docs/EVALS.md:104-112` describes the no-workers-until-`--execute` rule for `evals:baseline`.
- Export layout: copies of `common-decision-discipline/references/` and `assets/` exist under `.agents/skills`, `.claude/skills`, `.codex/skills`, and `.github/skills` (28 new preparation resources exported and parity-checked).
- Earlier briefs: seven files under `docs/brd/`, one commit each (`git log --follow`, this session); walkthroughs under `docs/srs/`.
- Dev dependencies (historical planning state): `node_modules/.bin/tsx` was absent at planning time; restored in T0 via `pnpm install --frozen-lockfile` (`tsx v4.23.15`).
- Configured workflows: `.skillsrc:24-57`.

## Next Workflow

- Maintainer rubric acceptance and explicit baseline-only run plan/spend authorization before T2b; slice approval before T3; `design-solution` and human gate before T4.
