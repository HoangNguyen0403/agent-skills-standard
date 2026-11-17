# Brief: Evaluate What The Agent Did, Not Only What It Wrote

slug: agent-eval-trajectory-evidence
operator_profile: hybrid
lane: both
snc_tier: high
model_tier: strong
approval: approved(requesting maintainer, 2026-11-16)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=2 C=2 total=6 tier=high (inference from a repository scan, not a scouted blast radius). Spread covers the eval runner, scorer, gate, run artifacts and the three verifier copies. Centrality is rounded up because release readiness rests on this evidence and one candidate slice touches the L3 execution boundary. The capability hint authorizes no premium spend.

Source revision inspected: `24d9034d21d3b2ab5815236d20ba32a4e85c4c04`, clean tree. Account domain: Personal (settled 2026-11-11, `docs/brd/brd-ags-improvement-criteria.md:165`).

Relation to approved work: `brd-skill-system-effectiveness.md` and `docs/srs/srs-skill-system-effectiveness.md` own the ROI pilot and the L3 executable lane, including its runtime and host decisions. `brd-ags-improvement-criteria.md` owns criteria Q1 to Q8 and slices SL1 to SL8. None is reopened. This brief adds a view those documents do not hold: which of the slides' evaluation practices the transcript evals already meet, and the smallest steps toward the rest.

## Decision Card

- **Outcome:** A mapping of the eight supplied slides to this repository's eval system, and a ranked direction for closing the gaps.
- **Finding:** The slides grade what an agent did, read from a recorded run. Our transcript evals grade what a tool-free worker wrote, with lexical assertions, and drop the worker's event stream. Regression is tracked as an average. The L3 lane that would observe behavior has an approved design and source work in progress; live qualification (D5) is pending.
- **Recommendation:** First plan is T2 only: report per-case pass-to-fail flips between comparable runs, report-only. No spend, no probe. T4 (rerun triggers) is next. T1 (trace retention) waits for evidence that the stream is complete enough to use. T3 (the six-question checklist) goes to the L3 owner as a scoped extension, not a new execution lane.
- **Strongest objection:** T2 still slices lexical scores. It exposes hidden regressions and measures no behavior.
- **Reversal condition:** If comparable run pairs prove too rare for T2 to report anything, start with T4 and the L3 extension request.
- **Non-goals:** Activating or redesigning L3, rewriting skills or assertions, paid runs, judge models.
- **Impact if wrong:** A gate section that seldom has data.
- **Open decisions:** none. All three were settled at the recommended defaults by approval (see Open Questions).
- **Approval:** granted 2026-11-16 for this brief and the T2 first plan only. No implementation, spend or release authority.

## You Said / I Assumed

**You said:** Investigate these articles. Reference how they evaluate the AI agent, and see how we can do the improvement better.

**I assumed:**

- "These articles" are the eight slides attached to the request (publisher mark "cloudxberry"). No URL, title or body text was supplied, so only what the slides show is used.
- "We" is this repository, and "the improvement" is how agent-skills-standard evaluates agents and skills (`scripts/evals`, `evals-report.md`). Improving the skills themselves stays with the approved briefs.
- The deliverable is an assessment and a direction. No eval code, skill or workflow is edited under this brief.
- Sponsor and decision-maker: requesting maintainer. Validation owner: an independent reviewer on the Personal analysis profile, plus the maintainer. Both are proposed, not appointments.
- Success example (agent-proposed): a skill edit raises the average pass rate but flips one pressure case to fail, and the gate names that case.
- Anti-goal (agent-proposed): trajectory checks a skill can satisfy by echoing words, such as asserting that the transcript says "I ran the tests".

## Contract

**Outcome:** as in the Decision Card.

**Constraints:**

- Reuse the existing manifest, immutable-input, scorer and gate path. No second eval pipeline and no second execution environment. (assumed)
- Completed runs stay immutable. New evidence applies to new runs only. (confirmed rule, `docs/EVALS.md:394`)
- Absent evidence is reported as `unknown`, never as a pass, following the existing unmetered-usage rule. (assumed)
- A content hash is integrity evidence. It does not show provenance or completeness. (confirmed rule, `docs/srs/srs-skill-system-effectiveness.md:62`)
- No model worker starts without an explicit `--execute` authorization. (confirmed rule, `docs/EVALS.md:104-115`)

**Non-goals:** activating, redesigning or re-deciding the host for L3; repairing assertions (SL2) or skills (SL4); fresh paid runs (SL8); an LLM judge; changing promotion thresholds; retrospective engine changes (SL6); any efficacy or savings claim.

**Acceptance criteria for this brief** (all assumed; the request stated none):

1. Each of the eight slides maps to an evaluation practice, the repository's current state with a citation, and a gap.
2. Each proposed slice states its proof, its spend need and the authority it requires.
3. No numeric target, threshold, duration or budget appears without a supplied or confirmed source.
4. The first plan contains only work that needs no model spend and no worker execution.
5. Approved briefs and the L3 SRS are extended, not reopened.

## Slide-To-Repository Mapping

"Transcript runner" below means `scripts/evals/execute.ts` and the L1/L2 scoring path. Claims about it do not describe L3.

| # | Slide | Practice it implies | Current state here | Gap |
| --- | --- | --- | --- | --- |
| 1 | Plan a few steps ahead (plan, act, observe, adjust) | Grade the path, including adjustment after an observation, not only the final answer | In the transcript runner each lane is one prompt and one final answer, and the worker is instructed not to use tools. confirmed(`scripts/evals/execute.ts:141-156,197-201`) | The transcript runner exercises no multi-step behavior. L3 is designed to observe candidate-owned behavior; that remains pending D5 |
| 2 | Planning needs limits (when to stop, how many actions, what to do when stuck) | Measure action count, repeated-failure loops and escalation | The retrospective reports "Tool failures" and "Error stops" for real sessions. confirmed(`docs/session-retrospective.md:213,249`) | No eval case tests a limit; none found in the transcript runner |
| 3 | The key question (add an agent only if something becomes clearer, safer or more reliable) | Compare against the simpler arrangement and keep the addition only on evidence | Every skill is compared with a no-skill baseline; 16 skills score below baseline. confirmed(`evals-report.md:23-25`; `docs/brd/brd-ags-improvement-criteria.md:63`) | Strong for skills. Whether multi-agent workflows beat inline execution is unknown; not searched beyond `docs/EVALS.md` |
| 4 | Real consequences (no approval at every low-risk step; approval for hard-to-undo actions) | Test both directions: no needless stops, and a stop at the risky action | 74 of 350 eval files hold pressure cases, graded on the answer text. confirmed(count this session, reproduced by the independent check) | The stop is claimed in prose, not observed as a withheld action |
| 5 | Ask the right questions (found the right code, relevant change, ran expected tests, tests pass, stayed in permissions, stopped for approval) | A per-task checklist mixing outcome, process and safety | The schema allows five assertion types; four are populated: `contains` 2,581, `regex` 1,066, `contains_any` 805, `not_contains` 97. confirmed(`scripts/evals/types.ts:182-183`; count reproduced by the independent check) | No populated type reads a diff, a command, an exit code or a tool call |
| 6 | Re-run representative tasks (v1 against v2 after a change to model, instructions, tools or permissions; 4/6 to 5/6 while one task regresses) | Per-task comparison across versions, so an aggregate gain cannot hide a regression | The gate applies per-skill thresholds and one trend on the average with-skill pass rate. confirmed(`scripts/evals/gate.ts:71-130`). Per-case scores exist in results. confirmed(`scripts/evals/types.ts:196-208`). The report's baseline comparison covers usage, not case outcomes. confirmed(`scripts/evals/reporter.ts:701-708`) | No per-case flip report found in `scripts/evals`, `cli` or `mcp` (two searches; a miss is not proof). The change gate lists skill, workflow and hook diffs; a model change is an environment override with no listed trigger. confirmed(`docs/EVALS.md:16-26,117-125`) |
| 7 | Precise checks and judgment (exit code and approved-tool list; people or written criteria for "is the fix appropriate") | Two grader kinds, each used where it fits | Precise checks run over prose. Judgment exists as independent adjudication of sampled classifications. confirmed(`docs/prd/prd-ags-improvement-criteria.md:154`). L3 can export a blinded reviewer bundle. confirmed(`docs/EVALS.md:419`) | No written-criteria grader for answer quality; assertion validity is unmeasured (Q5, `docs/brd/brd-ags-improvement-criteria.md:66`) |
| 8 | Record every run (timestamped tool calls, results, pauses, duration) | The run log is the evidence other checks read | The transcript runner holds the worker's JSONL stream in memory, parses it for token counts and writes only the answer and usage. confirmed(`scripts/evals/execute.ts:179-206,296-305`). The report states tool invocation is not retained. confirmed(`evals-report.md:4`). L3 evidence does carry event artifacts. confirmed(`scripts/evals/l3/runtime/evidence.test.ts:293-300`) | For transcript runs no trace survives, so tool-free execution cannot be checked |

Two existing facts raise the stakes. Many skills carry "response anchor" sections whose terms equal assertion values in that skill's own evals; the amendment to that finding records that this holds for many, not all, and that the size of any score inflation is unmeasured (`docs/brd/brd-skill-model-collaboration.md:82,174-180`). Real-task efficacy (Q8) is recorded as unknown because the L3 lane has not run (`docs/brd/brd-ags-improvement-criteria.md:69`).

L3 status, so that nothing here duplicates it: the design is approved, a dedicated disposable VM and a direct Apple VZ runner are selected, and D1 to D4 source work is authorized, with D2 and D3 corrections in progress. D5 live qualification needs separate authorization and is pending. confirmed(`docs/srs/srs-skill-system-effectiveness.md:21-27,264-272`). Until then `build` and `run` stop at preflight. confirmed(`scripts/evals/l3/index.ts:353-356,564-565`)

## Why

- **Objective ID:** BRD-OBJ-001
- **Objective statement:** Every gated run that has a comparable earlier run lists the cases that flipped from pass to fail, and says so plainly when no comparable run exists.
- **Baseline:** no per-case flip report found. (see row 6)
- **Target:** every gated run. Window: unknown; the maintainer sets it when the plan is approved.
- **Owner:** requesting maintainer (proposed).
- **Objective ID:** BRD-OBJ-002
- **Objective statement:** A recorded go, defer or no-build decision for each of T1 (trace retention) and T3 (checklist as an L3 extension).
- **Baseline:** no decision recorded. **Owner:** requesting maintainer (proposed). Window: unknown.
- **Users:** maintainers who release skills and workflows; consumers who read `evals-report.md` as a quality signal.
- **Problem:** A release decision rests on an average that can rise while a specific case regresses, and on scores that cannot show whether an agent stayed in scope, ran the checks or stopped at a risky step.
- **AS-IS:** prompt, final answer, lexical assertions, average trend.
- **TO-BE:** the same path plus a per-case comparison; later, process and safety questions answered from observed actions in L3.
- **Value type:** risk. The benefit is unmeasured and stays a hypothesis.
- **Business alternatives:** build in small steps (recommended); defer everything until L3 qualifies; do nothing and keep the report's existing caveats.

## Direction Options And Recommendation

### Option 1: Per-case flip report only (recommended)

- What: `evals:gate` lists cases that passed in a comparable earlier run and fail now, without changing its exit code.
- Load-bearing assumption: enough run pairs are comparable for the report to have content.
- Evidence limits: three physical runs exist. confirmed(`evals-report.md:36-40`). How many pairs share prompts, assertions and protocol is unknown. `baselineRunId` is optional. confirmed(`scripts/evals/types.ts:170-171`). Changed assertions are regraded, not regenerated. confirmed(`scripts/evals/impact.ts:330-336`)
- Decisive trade-off: no spend and no dependency, against no new behavioral evidence.
- Proof: a fixture pair with a higher average and one flipped case makes the gate name that case; a pair with changed assertions labels the flip as a rubric change; a run without a baseline reports `no-baseline`.
- First failure condition: on the retained runs the report is empty for lack of comparable pairs.
- Worst plausible case: maintainers read single-trial flips as verdicts.
- Cost to abandon: one report section.

### Option 2: Trace retention plus the flip report

- What: Option 1, and the transcript runner also keeps each worker's event stream as hashed run evidence.
- Load-bearing assumption: the Codex stream carries tool and command events, and carries them completely enough that "no tool events" means no tools.
- Evidence limits: the installed CLI (0.167.0) has `--json` and `--sandbox`. confirmed(command output). The fixtures show `agent_message` and `token_count` examples only, which proves nothing about other event types. (`scripts/evals/usage-cost.test.ts:92,100`). Completeness is unknown. The worker instruction itself says tool avoidance is not host-enforced. confirmed(`scripts/evals/execute.ts:147`)
- Decisive trade-off: starts a run log for transcript runs, against a probe that needs spend authorization and a status that must stay `unknown` until event coverage is qualified.
- Proof: verification fails on a missing or altered trace; per-lane tool status reads `verified` only where event coverage is qualified, else `unknown`.
- First failure condition: a probe shows no tool events, or shows them only for some tool classes.
- Worst plausible case: an incomplete stream is reported as proof of tool-free execution.
- Cost to abandon: one optional artifact field, its verifier support in three packages, and a privacy review.

### Option 3: Judgment first

- What: add a written-criteria grader, by people or a model, over existing transcripts.
- Load-bearing assumption: prose transcripts hold enough to judge appropriateness.
- Evidence limits: no grader calibration data exists; assertion validity is already unmeasured. confirmed(`docs/brd/brd-ags-improvement-criteria.md:66`)
- Decisive trade-off: covers slide 7 quickly, against grading the same prose the anchors may already distort.
- Proof: grader verdicts agree with a blinded human sample at a rate the maintainer accepts. Rate: unknown, measure first.
- First failure condition: graders disagree with each other on the sample.
- Worst plausible case: a second score that also tracks wording.
- Cost to abandon: grader prompts and the calibration sample.

**Recommendation:** Option 1. It is the smallest option that meets the contract and the cheapest to abandon while stream completeness is unknown. Option 2's trace half stays available as T1 once a probe is authorized.

**Riskiest assumption:** viability of T2, that comparable run pairs exist. **Cheapest test:** at the start of planning, compare the retained runs' input snapshots offline and count matched cases. No spend.

**Strongest objection and reversal condition:** as in the Decision Card.

## Proposed Slices

| ID | Slice | Slides | Proof | Spend and authority |
| --- | --- | --- | --- | --- |
| T2 | Per-case flip report in `evals:gate`, report-only. Cases match on skill, case ID and arm. A pair is comparable only when prompt, assertions, protocol and assertion-semantics version match. Flips after an assertion change are labelled rubric change. Added and removed cases are listed apart. No baseline reports `no-baseline` | 6 | As Option 1 | No spend. Plan approval |
| T4 | Change-trigger rule: name which changes (model, instructions, tools, permissions) make existing evidence stale for a rerun decision | 6 | A run whose model differs from its comparison run is labelled not comparable | No spend. Plan approval |
| T1 | Keep the transcript worker's event stream per lane as hashed evidence, allowlisted fields only. Tool status is `verified` only with qualified event coverage, else `unknown` | 8, 2 | As Option 2 | Probe needs spend authorization; the attempt cap is the maintainer's to set. Then plan approval |
| T3 | Request to the L3 owner: add process and safety oracles for the six checklist questions (scope kept, expected tests run, approval pause) as a separately scoped extension. No new execution lane; the host decision stands | 1, 2, 4, 5 | The L3 owner records accept, defer or reject; if accepted, a reference candidate that leaves scope fails the matching question | No authority here. Enters through the L3 SRS owner after D5 |
| T5 | Written-criteria judgment for "is the fix appropriate", calibrated on a blinded human sample, applied to L3 artifacts | 7 | Agreement with the human sample is reported; the rate is `unknown` until measured | Spend authorization; after T3 |

Suggested order: T2, T4, then the T1 probe decision, T3 after D5, T5 last.

Additions beyond the slides, agent-proposed and unmeasured here:

- A single trial per case makes a flip a signal, not a verdict. Repeat-trial variance is unknown; measure it before any flip blocks a release.
- Grade the resulting state (diff, exit code) and not the agent's own account of it.
- Keep held-out tasks out of authoring, as the existing `*-heldout.json` packets already do.

## Evidence

| Claim | Status |
| --- | --- |
| Slide content (eight images) | supplied by the requester; source URL and author unknown |
| Transcript workers run `codex exec` with `--sandbox read-only --json`; tool avoidance is a prompt instruction | confirmed(`scripts/evals/execute.ts:58-76,141-156`) |
| The transcript runner parses the JSONL stream for usage and writes only the answer and usage | confirmed(`scripts/evals/execute.ts:179-206,296-305`) |
| Report header: tool invocation not retained; tool-free execution unverified | confirmed(`evals-report.md:4`) |
| Assertion counts over 350 eval files; 74 files with pressure cases | confirmed(command output; recounted by the independent check) |
| Gate trend is one aggregate metric; thresholds are per skill | confirmed(`scripts/evals/gate.ts:71-130`) |
| No per-case flip report | not found in `scripts/evals`, `cli`, `mcp` by two searches; a search miss is not proof of absence |
| L3 design approved, runtime selected, D1 to D4 source authorized, D5 pending | confirmed(`docs/srs/srs-skill-system-effectiveness.md:21-27,264-272`) |
| L3 retains event artifacts in its evidence | confirmed(`scripts/evals/l3/runtime/evidence.test.ts:293-300`) |
| Root, CLI and MCP verifiers share one path; the matcher is copied in three places | confirmed(`docs/EVALS.md:388-390`) |
| Retrospective reads recorded tool calls of real sessions | confirmed(`docs/session-retrospective.md:9,213,249`) |
| Codex stream contains complete tool or command events | unknown; probe not run |
| Comparable run pairs exist among retained runs | unknown; offline check proposed |
| Trajectory evidence will change release decisions | assumed; no measurement exists |

Per-evidence-lane status for this brief: document review assessed; independent review assessed (one round, see Planner Check); code execution, live eval run and runtime behavior not assessed.

## Risks

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| Flips compared across changed prompts or assertions | False regressions | Comparability rule in T2; rubric-change label | Plan owner |
| Single-trial flips read as verdicts | False alarms, gate distrust | Report-only until variance is measured | Requesting maintainer |
| A thin trace reported as proof of tool-free execution | False assurance | `verified` only with qualified event coverage | Requesting maintainer |
| Traces leak host paths or file content into committed runs | Privacy and repository hygiene | Allowlist event fields at design; follow the L3 bundle's path scrubbing | Requesting maintainer |
| Checklist work duplicates L3 | Two executable lanes | T3 is a request to the L3 owner, not a lane | Requesting maintainer |

## Planner Check

- Placeholders: none. Unknowns are labelled with an owner.
- Contradictions: none known after the corrections below.
- Multi-plan scope: five slices listed; only T2 is proposed for the first plan.
- Two-reading ambiguity: "the improvement" was read as the evaluation method. If the requester meant improving the skills, the mapping still stands and the slices move behind SL2 and SL4.
- Delegated to the builder: report layout and wording for flips.
- Independent check (required at tier=high): run once on the first draft by a separate read-only session on the "Personal · Analysis & Review" profile. Verdict: FIT WITH CORRECTIONS. Corrections applied in this revision: L3 status restated and T3 turned from a new execution lane into an extension request; absence claims scoped to the transcript runner; hash integrity separated from tool-free proof; the first plan reduced from T1 + T2 to T2; a comparability rule added to T2; the probe's attempt count left to the maintainer; four evidence wordings qualified. The corrected revision has not been re-reviewed.

## Open Questions

1. **T2 gate behavior.** Settled by approval of the recommended default: report-only until variance is measured.
2. **T1 probe.** Settled by approval of the recommended default: decide after T2 lands. No probe is authorized. Affects T1 only.
3. **T3 timing.** Settled by approval of the recommended default: raise the checklist extension with the L3 owner after D5.

## Approval

approval: approved(requesting maintainer, 2026-11-16) through the explicit reply "ok" to this brief's approval request; scope: this brief only, including the T2 first plan and the three recommended defaults; reopen: affected section only.
revision presented for approval: SHA-256 `8201283742168ec546b1273c1f57536c8eb690744760eec9f21cfaebc0e278cf` at source revision `24d9034d21d3b2ab5815236d20ba32a4e85c4c04`. This file differs from it only by the approval record, the later review note below, and the Outcome Report's trace fields.
authority: planning handoff for T2 only; never implementation, spend, release or runtime activation. T1, T3, T4 and T5 need their own approval. The corrected revision was approved before its second independent review; that review has since run and returned FIT (see `docs/prd/prd-agent-eval-trajectory-evidence.md`, Independent Check).

## Outcome Report

{"schema_version": 1, "run_id": "unknown", "slug": "agent-eval-trajectory-evidence", "workflow": "brainstorm-feature", "feature_status": "requirements_ready", "approval": "approved(requesting maintainer, 2026-11-16)", "started_at": null, "completed_at": null, "requirement_trace": {"brd_objectives": ["BRD-OBJ-001", "BRD-OBJ-002"], "requirements": [], "acceptance_criteria": [], "srs": []}, "completed_evidence": ["slide-to-repository mapping", "evidence ledger at revision 24d9034d2", "independent check round 1: FIT WITH CORRECTIONS, corrections applied", "human sign-off 2026-11-16", "independent check round 2 on the corrected revision: FIT", "comparable-run-pair count (see the plan)"], "missing_evidence": ["codex event-stream completeness", "repeat-trial variance"], "decision_needed": [], "recommended_next_workflow": "plan-feature", "cost": {"source": "unavailable"}, "agent": {"identity": "unknown", "model": "anthropic/claude-fable-5-2"}}

## Next Workflow

`plan-feature` for T2 (per-case flip report, report-only). Planning starts with the offline count of comparable run pairs.
