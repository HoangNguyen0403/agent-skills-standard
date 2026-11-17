# Feature Plan: Per-Case Flip Report In The Eval Gate (T2)

slug: agent-eval-trajectory-evidence
operator_profile: hybrid
lane: both
snc_tier: high (programme); medium for this slice
delivery_mode: standard
approval: approved(requesting maintainer, 2026-11-16); execution: Subagent-Driven on "Personal - DeepSeek", selected by maintainer
source: `docs/brd/brd-agent-eval-trajectory-evidence.md`, approved(requesting maintainer, 2026-11-16), inspected at `24d9034d21d3b2ab5815236d20ba32a4e85c4c04`
account domain: Personal (maintainer decision, 2026-11-11)

Slice SNC: S=1 N=1 C=1 total=3 tier=medium. One module (`scripts/evals`), an added report inside existing gate logic, shared but non-core code. The gate runs in CI (`.github/workflows/ci.yml:215`); this slice must not change its exit behaviour.

## Decision Brief

- **Changes since approved revision:** none to scope. The brief's riskiest assumption was tested offline: comparable run pairs exist.
- **Recommendation:** approve one slice. `evals:gate` adds a report-only comparison of each case against the run's declared baseline run and names the cases that went from pass to fail.
- **Impact if wrong:** maintainers treat a single-trial flip as a verdict, or a flip caused by a changed assertion is read as a skill regression. The comparability rule and the documented caveat are the controls.
- **Evidence and limitations:**
  - Run `all-v2.6.1-2026-09-22T07-28-44-830Z-0e7f8fb4` declares baseline `governed-cybersecurity-20260922-attribution`. confirmed(both `results.json`)
  - The two runs share 14 skills and 167 case-arms: 92 `eval`, 75 `trigger`, no `pressure`. confirmed(offline script, this session; recomputed separately by the independent check)
  - Both manifests carry the same instruction protocol, assertion-semantics version and activation-evidence version, and no compromised skill. confirmed(both `manifest.json`)
  - Average with-skill pass rate rose from 0.6726 to 0.6755, which the gate labels `improved`. confirmed(`benchmarks/evals/history.json`; `scripts/evals/gate.ts:93-120`)
  - Three with-skill `eval` cases with an identical prompt and identical assertions went from pass to fail after a skill-body change: `common/common-llm-security` eval-4, `cybersecurity/cyber-authorization` eval-1, `cybersecurity/cyber-evidence` eval-3. No trigger case flipped. confirmed(same two computations)
  - Limitation: each is one trial, and the failed assertions are lexical (`contains:efficacy` and two `contains_any` lists). They are signals to inspect, not proof of worse behaviour.
  - Limitation: the retained pair holds no pressure case, so pressure comparison is exercised by fixtures only.
  - Pre-change behaviour, recorded after approval with dependencies installed: `evals:gate -- --run` on that run exits 1 with 11 of 14 skills breaching and trend `improved`; on `all-v2.6.0` it exits 1 with trend `no-prior-data`; `--all` exits 0 with nothing pending. confirmed(command output, `/tmp/ags-t2-evidence/pre-*.out`)
- **Execution decision:** Subagent-Driven. The maintainer replied "a, but use personal deepseek instead of cheap" on 2026-11-16. The implementer profile is "Personal - DeepSeek" by that instruction, in place of the default first route.
- **Authority:** bounded repository implementation and verification of Task 1 only. No model call through the eval runner, eval run, merge, release or activation.
- **Independently ready slices:** Task 1, once dependencies are installed (P0).

## Outcome And Guardrails

- **Outcome:** BRD-OBJ-001. A gated run with a declared baseline lists its pass-to-fail cases; a run without one says so.
- **Guardrails:**
  - `evals:gate` keeps its current `ok` value, breaches, trend and exit code for every input. A failure inside the comparison is reported, never thrown.
  - Gate failures that exist today stay failures.
  - No model call and no eval run.
  - No edit to any `SKILL.md`, `evals.json`, run directory, `history.json` or archive.
  - No change to `cli/` or `mcp/`. The gate API is consumed only by `scripts/evals/index.ts` and its tests. confirmed(search this session and by the independent check)

## Scope And Non-Goals

- **Scope fence:** `scripts/evals/gate.ts`; the `gate` case in `scripts/evals/index.ts`; gate tests under `scripts/evals/`; `docs/EVALS.md`; `CHANGELOG.md`. `scripts/evals/manifest.ts`, `scorer.ts` and `impact.ts` may be touched only to export an existing rule for reuse, with behaviour preserved.
- **In scope:** compare case scores with the declared baseline; decide comparability per case; report pass-to-fail cases; report why a comparison is unavailable.
- **Non-goals:** failing the gate on a flip; labelling model, tool or permission changes (T4); marking which answers were reused; trace retention (T1); any L3 work (T3); repeat trials or variance measurement; changes to `evals:report`, `evals-report.md` or `history.json`; guessing a baseline from history.

## Requirements And Acceptance Criteria

Product owner: requesting maintainer. Engineering owner: the implementer chosen under the execution decision. QA owner: independent reviewer on the Personal review profile.

Terms used below, defined once:

- **Case-arm:** one score, identified by category, skill, case ID and arm.
- **Case definition:** for `eval` cases the prompt and assertions; for `pressure` cases the prompt and behaviour assertions; for `trigger` cases the prompt text and expected decision. It is read from each run's own `inputs.json` using the identity rules of the manifest builder (`scripts/evals/manifest.ts:208-252`). Trigger IDs are positional, so an ID match alone does not show the same case.
- **Effective protocol of a skill in a run:** its instruction-protocol version, its assertion-semantics version and, for trigger cases, its activation-evidence version. Each is resolved from that run's `manifest.json` by the rules the scorer and the impact planner already apply: per-skill provenance first, then the manifest-level value (`scripts/evals/scorer.ts:437-451`, `scripts/evals/impact.ts:216-225`). A value those rules leave undefined is unresolved.
- **Comparable:** a case-arm present in both runs, answered in both, not marked compromised in either, with an identical case definition and an identical, fully resolved effective protocol. Two unresolved values are not identical.
- **Reused answers:** an incremental run copies some answers from an earlier compatible run, which need not be the declared baseline (`scripts/evals/impact.ts:473-506`). Such a case-arm is compared like any other. When graded the same it counts as unchanged; it is not a fresh trial.

| Req ID | Requirement | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-001 | The gate outcome for a run includes a case comparison against that run's declared `baselineRunId`, and against no other run | Engineering owner | P0 | implemented; locally verified and independently reviewed |
| REQ-002 | Only comparable case-arms count as pass-to-fail or fail-to-pass. A matched case-arm that is not comparable is reported apart, under the first reason that applies: excluded, protocol-mismatch, protocol-unresolved, definition-changed | Engineering owner | P0 | implemented; locally verified and independently reviewed |
| REQ-003 | The comparison carries one explicit state: `compared`, `no-baseline` or `unavailable`. `unavailable` carries a reason naming the evidence that could not be read | Engineering owner | P0 | implemented; locally verified and independently reviewed |
| REQ-004 | The comparison never changes `ready`, `ok`, breaches, trend or the exit code, including when its own evidence is missing or malformed | Engineering owner | P0 | implemented; locally verified and independently reviewed |
| REQ-005 | Text and JSON output name every comparable pass-to-fail case-arm with its skill, case ID, arm and failed assertions, and give counts for fail-to-pass, unchanged, each not-comparable reason, added and removed | Engineering owner | P1 | implemented; real CLI smoke verified |
| REQ-006 | `docs/EVALS.md` describes the comparison, its states, the comparability rule, reused answers and the single-trial caveat; `CHANGELOG.md` records the change | Engineering owner | P1 | implemented; independently reviewed |

All requirements trace to BRD-OBJ-001.

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-005 | A baseline and a current run where the current average with-skill pass rate is higher and one comparable with-skill `eval` case passed before and fails now | the current run is gated | the trend is `improved` and pass-to-fail lists exactly that case-arm with its failed assertions | Engineering owner | unit test |
| AC-002 | REQ-002 | A comparable `pressure` case-arm that passed before and fails now | the run is gated | it is listed under pass-to-fail | Engineering owner | unit test |
| AC-003 | REQ-002 | A matched `eval` case-arm whose assertions differ between the two input snapshots and whose result went from pass to fail | the run is gated | it is counted as definition-changed and absent from pass-to-fail | Engineering owner | unit test |
| AC-004 | REQ-002 | A `trigger` case-arm with the same ID in both runs but a different prompt text | the run is gated | it is counted as definition-changed | Engineering owner | unit test |
| AC-005 | REQ-002 | Two runs where one skill's effective protocol differs and another skill's is identical | the current run is gated | the first skill's case-arms are counted as protocol-mismatch and the second skill's are compared | Engineering owner | unit test |
| AC-006 | REQ-002 | A skill whose instruction-protocol version is undefined in both runs | the run is gated | its case-arms are counted as protocol-unresolved and none is a flip | Engineering owner | unit test |
| AC-007 | REQ-001, REQ-003 | A run with no `baselineRunId`, while history holds an earlier record for its category | the run is gated | the state is `no-baseline` and no case-arm is compared | Engineering owner | unit test |
| AC-008 | REQ-003, REQ-004 | A run whose declared baseline lacks `results.json`, `inputs.json` or `manifest.json` | the run is gated | the state is `unavailable` with a reason naming the missing file, and `ok`, breaches and trend equal those of the same run gated without a baseline | Engineering owner | unit test |
| AC-009 | REQ-003, REQ-004 | A run whose own `inputs.json` or `manifest.json` is missing or is not valid JSON, once for a run that meets every threshold and once for a run that breaches one | the run is gated | nothing is thrown, the state is `unavailable` with a reason, and `ok` is true for the first run and false for the second | Engineering owner | unit test |
| AC-010 | REQ-005 | A case-arm present only in the current run | the run is gated | it is counted as added and is not a flip | Engineering owner | unit test |
| AC-011 | REQ-005 | A case-arm present only in the baseline run | the run is gated | it is counted as removed and is not a flip | Engineering owner | unit test |
| AC-012 | REQ-002 | A matched case-arm with a missing answer in either run | the run is gated | it is counted as excluded and is not a flip | Engineering owner | unit test |
| AC-013 | REQ-002 | A matched case-arm in a skill and arm marked compromised in either run | the run is gated | it is counted as excluded and is not a flip | Engineering owner | unit test |
| AC-014 | REQ-004 | A run that meets every threshold and has a pass-to-fail case | `evals:gate -- --run` is executed | `ok` is true and the exit code is 0 | Engineering owner | unit test |
| AC-015 | REQ-001, REQ-005 | The retained run `all-v2.6.1-2026-09-22T07-28-44-830Z-0e7f8fb4` | `pnpm evals:gate -- --run <that id> --json` is executed | the state is `compared` against `governed-cybersecurity-20260922-attribution`, and pass-to-fail is exactly the three with-skill case-arms named in the Decision Brief | Orchestrator | CLI smoke |
| AC-016 | REQ-004 | The same retained run | the same command is executed before and after the change | `ok`, breaches, trend and exit code are equal | Orchestrator | CLI smoke |
| AC-017 | REQ-003 | The retained run `all-v2.6.0` | `pnpm evals:gate -- --run all-v2.6.0 --json` is executed | the state is `no-baseline` | Orchestrator | CLI smoke |
| AC-018 | REQ-004 | The repository as retained, where every run is already in history | `pnpm evals:gate -- --all` is executed before and after the change | message and exit code are equal | Orchestrator | CLI smoke |
| AC-019 | REQ-006 | The change is complete | `docs/EVALS.md` and `CHANGELOG.md` are read | the regression-gate section covers the items in REQ-006 and the changelog has an Unreleased entry | QA owner | review |

Oracle for AC-015: the expected three case-arms were computed before any implementation existed, once by the plan author and once, separately, by the independent reviewer. The two computations agree.

## Open Consequential Decisions

No open decision. The execution approach is settled (see Decision Brief).

Delegated to the implementer: names of types, fields, reasons and output wording; whether an existing rule is exported for reuse or pinned by a parity test. One constraint applies: no second, unpinned copy of the case-identity mapping or of the protocol resolution. New gate tests go in `scripts/evals/gate.test.ts`; the existing gate tests in `scripts/evals/usage-cost.test.ts` stay as they are.

## Implementation Plan, Task Slices And Verification Plan

### P0: prerequisite (typed exception: prerequisite)

- Owner: orchestrator. Owned paths: `node_modules` only; the lockfile stays frozen.
- Result: `pnpm install --frozen-lockfile` exited 0 and `rtk pnpm exec tsx --version` printed `tsx v4.23.15`. Done 2026-11-16.
- Consumer: Task 1.

### Task 1 — T2: per-case flip report

Type: feature slice. Estimate: S, confidence medium. Routing: tier=medium. Trace: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006; AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019.

**Scope / owned write set:** `scripts/evals/gate.ts`, `scripts/evals/gate.test.ts` (new), the `gate` case in `scripts/evals/index.ts`, `docs/EVALS.md` (regression-gate section), one `CHANGELOG.md` entry under Unreleased. `scripts/evals/manifest.ts`, `scripts/evals/scorer.ts` and `scripts/evals/impact.ts` only to export an existing rule, with behaviour preserved. Nothing else.
**Inputs:** this approved plan; the retained runs under `benchmarks/evals/runs/` (read-only); the existing gate, scorer, manifest and impact code.
**Outputs:** the case comparison in the gate outcome, its text and JSON output, tests for AC-001 to AC-014, and the documentation named above.
**Real Ingress:** `pnpm evals:gate -- --run <runId> [--json]` and `pnpm evals:gate -- --all [--json]`.
**Invariants:**
- Positive: a comparable case-arm that passed in the declared baseline run and fails in the gated run is named under pass-to-fail.
- Negative: no input, including missing or malformed comparison evidence, changes `ready`, `ok`, breaches, trend or the exit code; no baseline is ever inferred from history.
**Verification owner:** implementer for the focused tests via `rtk node --import tsx --test scripts/evals/gate.test.ts`; orchestrator for `rtk pnpm test:evals` and the consumer smoke in AC-015 to AC-018; independent reviewer for AC-019 and the diff.
**Handoff / freeze:** the implementer's report marked FINAL freezes the owned writes and lists changed paths, RED and GREEN output, and remaining risks. Source freeze precedes review.
**Correction route:** one corrective follow-up naming the failed AC; if that also fails, the slice moves to "Personal · Delivery". No automatic premium.

- [x] Write the failing tests for AC-001 to AC-014 with fixture runs in a temporary directory, and observe them fail for the expected reason.
- [x] Implement the comparison and its output.
- [x] Update `docs/EVALS.md` and `CHANGELOG.md`.

Error boundaries: every read and every computation added for the comparison is contained, so that a failure becomes state `unavailable` with a reason. A case definition that cannot be resolved makes that case-arm definition-changed, never comparable.

Decision boundary: if a requirement cannot be met without touching a path outside the owned write set, or without changing gate exit behaviour, the implementer stops and reports the evidence.

### Integration and review

- The orchestrator checks every AC against the evidence returned, and runs the consumer smoke itself.
- Independent review of the diff on the "Personal · Analysis & Review" profile, in a session separate from the implementer.
- Remote CI is outside this plan's authority and is reported as NOT RUN until the maintainer pushes.

## Status And Receipt

- `feature_status`: implemented; local verification and independent technical review complete. Remote CI and human acceptance are not assessed.
- Run record: not written. Packets, reports, review packages and command output are kept under `.agent/sdd/prd-agent-eval-trajectory-evidence/` (untracked).
- Implementation commit: `98833a3f5839f0dedb87d5a91f146952ea1f8e15`. No model call, eval run, merge, release or activation was performed.

## Verified Delivery

- **Implementers:** "Personal - DeepSeek" delivered the slice and correction round 1. The first re-review found that round incomplete, so the slice moved to "Personal · Delivery" under the correction route, which delivered correction round 2 in `scripts/evals/gate.ts` and `scripts/evals/gate.test.ts` only.
- **Changed files:** `scripts/evals/gate.ts`, `scripts/evals/gate.test.ts` (new), `scripts/evals/index.ts`, `scripts/evals/manifest.ts`, `scripts/evals/scorer.ts`, `scripts/evals/impact.ts`, `docs/EVALS.md`, `CHANGELOG.md`. All inside the owned write set.
- **Focused checks:** `scripts/evals/gate.test.ts` 21 tests, 21 pass. RED was observed before each implementation step: 14 of 14 failing on the missing comparison, then 4 new tests in round 1 and 2 in round 2 failing for the behavioural reason. One AC-014 fixture needed a setup fix before its RED was valid.
- **Suite, run by the orchestrator:** `pnpm test:evals` 930 tests, 930 pass; `tsc --noEmit` exit 0.
- **Consumer smoke, run by the orchestrator on the final revision:**
  - AC-015: `all-v2.6.1-…` reports `compared` against `governed-cybersecurity-20260922-attribution`; pass-to-fail is exactly the three expected with-skill case-arms. Totals: 3 pass-to-fail, 2 fail-to-pass, 136 unchanged, 26 definition-changed, 54 added, 0 removed.
  - AC-016: exit 1 before and after; the JSON is identical to the pre-change output once `caseComparison` is removed.
  - AC-017: `all-v2.6.0` reports `no-baseline`.
  - AC-018: `--all` text and JSON are byte-identical to the pre-change output; exit 0.
- **Independent review:** three rounds by a separate read-only session on "Personal · Analysis & Review".
  - Round 1, Needs fixes: an existing changelog entry had been truncated; a non-string failed-assertion value could throw while printing; a declared baseline ID could escape the run store.
  - Round 2, Fixes incomplete: a non-string baseline ID could still throw while printing; the gated run's own evidence was read by its embedded run ID; the AC-001 fixture did not show the average rising against the declared baseline.
  - Round 3: ALL FINDINGS ADDRESSED; no Critical or Important issue remains.
- **Beyond the plan, added through review:** the comparison validates score fields, confines the baseline ID to one run-store name, checks the loaded `results.json` run ID on both runs, and reads the gated run's evidence from the directory being gated.
- **Not done:** remote CI; a separate whole-branch review (the plan has one slice, and each review package covered the whole change from the base revision); variance measurement; any other slice of the brief.

## Independent Check

Run once on the first draft of this plan, by a separate read-only session on the "Personal · Analysis & Review" profile. The same session re-checked the brief's corrected revision and returned FIT: all seven earlier findings resolved.

Verdict on this plan: FIT WITH CORRECTIONS. The reviewer reproduced the Decision Brief numbers with its own computation and judged the slice sizing defensible and the scope fence sufficient. Corrections applied in this revision:

- Protocol comparison is per skill and read from the manifests, with unresolved values never treated as equal; compatible skills are still compared. The run-level `protocol-mismatch` state is gone.
- Failures in the comparison's own evidence, on either run, become state `unavailable`; AC-008 and AC-009 test this for passing and breaching runs.
- Reused-answer semantics are stated, and the oracle for AC-015 cites both computations.
- Bundled criteria are split (AC-010 to AC-013, AC-015 and AC-016), and a pressure fixture is added (AC-002).

The corrected revision was not re-reviewed as a document. The implementation built from it was reviewed (see Verified Delivery).

## References

- `docs/brd/brd-agent-eval-trajectory-evidence.md` (approved 2026-11-16; slice T2, Open Questions 1 to 3 settled)
- `scripts/evals/gate.ts:71-209`; `scripts/evals/index.ts:426-452`; `scripts/evals/types.ts:196-252`; `scripts/evals/manifest.ts:208-252`; `scripts/evals/scorer.ts:437-451,617-634`; `scripts/evals/impact.ts:73-95,216-225,473-506`
- `benchmarks/evals/runs/*/{results,inputs,manifest}.json`; `benchmarks/evals/history.json`
- `docs/EVALS.md:297-321`

## Next Workflow

- `verify-work`, then remote CI and maintainer review. Commit, merge and release need their own authority. T4, T1, T3 and T5 of the brief stay unapproved.
