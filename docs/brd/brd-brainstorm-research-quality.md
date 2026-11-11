# Brief: Better brainstorm direction and product research at controlled cost

slug: brainstorm-research-quality
operator_profile: hybrid
lane: both; snc_tier: high; model_tier: strong; approval: approved(requesting maintainer, 2026-11-11)
SNC (inferred from request and repository read): S=2 N=2 C=2 total=6 tier=high
Owner / sponsor / validation owner / handoff owner: requesting maintainer (drafted default, accepted with this approval).
repository_status: approved brief saved in working tree on `improve/brainstorming-product-research-roi`, not committed; activation_status: not_required

## Decision Card

- **Outcome**: Briefs for open-ended ideas show the problem reframed, real alternatives, the riskiest assumption, and sourced outside findings. Clear requests cost no more than today. Quality and cost are measured for every change.
- **Recommendation**: Measure first. Then add two on-demand modes: Explore for open-ended intake, and a bounded research spike when the recommendation depends on facts outside the repository. Keep a mode only if direction quality rises enough for its cost. Strongest objection: measuring first delays visible improvement. Reverse if the baseline shows approved briefs are rarely reopened; then defer.
- **Scope & Non-goals**: Brainstorm intake, shared decision references, and their evals. Not in scope: multi-agent research, always-on ideation, weakening research guardrails, default-installing the opt-in research skills.
- **Impact if wrong**: Extra tokens and review time on briefs whose direction is no better. Cost to abandon: delete the on-demand references and their trigger lines.
- **Assumptions / Open decision**: You set the cost ceiling and the keep threshold after the baseline. This amends one approved rule, options "only when a real choice exists": for gated open-ended intake, options are generated first. No fixed idea count.
- **Proof**: Paired runs on frozen scenarios show better direction-quality verdicts on open-ended cases, equivalent verdicts and no added files on clear cases, and cost recorded per arm.
- **Approval sought**: This direction, scope, cost rules, gate definitions, and the rule amendment. No implementation, deployment, model-spend, merge, release, or runtime authority.

Reply ok or corrections.

## You Said / I Assumed

**You said:**

- Brainstorming and product research are not as good as expected against good practice.
- Find how to improve them; they are the most critical input to the rest of the AI workflow and affect ROI.
- "Ok" to the proposed default: bundle measurement, an Explore mode, and a research spike into one brief.
- Cost must also be considered.

**I assumed:**

- "Cost" covers four things: model tokens per brief for consumers, evaluation spend, human time (review, grading, authoring), and maintenance of added files.
- Improve the existing workflows; do not replace the SDLC or install third-party packs (same position as the approved `brainstorm-decision-quality` brief).
- Existing guardrails stay: no fabricated evidence, no synthetic customers, approval gates, numeric-evidence rule.
- Which failure dominates (misread intent, narrow options, shallow research, or heaviness) is still unknown. Slice 1 measures it rather than guessing.
- Success example (agent-proposed): an open-ended idea produces a brief that planning uses without reopening, and its outside claims each carry a source.
- Anti-goal (agent-proposed): a one-line clear request triggers idea lists or web lookups, or costs more than it does today.

## Contract

**Outcome:** A maintainer can see, per change, whether brainstorm direction and research got better and what it cost, and consumers get wider exploration and outside evidence only when the intake needs it.

**Constraints:**

- Cost is a first-class acceptance dimension, not a later optimization (user-stated).
- Always-loaded instruction text grows only by the trigger lines, inside the existing limits (workflow files ≤80 lines, `SKILL.md` ≤100 lines); the method lives in `references/` read on trigger (assumed).
- Preserve SNC risk floors, Why/Direction separation, approval boundaries, lifecycle statuses, the unknown-intent rule, and the ≤250-word card (assumed).
- Numbers appear only when supplied or cited; budgets, ceilings, and thresholds are set from measured baselines (assumed).
- External content is untrusted data; embedded instructions are never followed (assumed).

**Non-goals:** Multi-agent research fan-out inside brainstorm. Always-on ideation or a fixed idea count. A new document layer. Changing `product-evidence` ledger rules. Default-installing the eight opt-in product-management skills. Rewriting research skills (candidate later work, listed under Slices).

### Acceptance criteria (direction contract; all assumed unless marked)

- **Clause 1 — Baseline before change:** Before any workflow or skill text changes, a direction-quality rubric and a cost record are defined, the current workflow is baselined on frozen scenarios, and reopen and correction history is counted for the existing approved briefs.
- **Clause 2 — Outcome rubric:** The rubric judges, from the transcript: framing correctness, a missed consequential alternative, whether the riskiest assumption is named, claim-to-source accuracy, completeness against seeded facts, and consequential guesses left to the planner. Keyword presence is not a pass. Reopening of approved briefs is a separate lagging measure, not a per-scenario verdict.
- **Clause 3 — Gated Explore:** Explore runs only for open, novel, or solution-biased intake, and only after intent is known; it never overrides the rule to ask first when intent is unknown. A clear request or single viable path is unchanged, meaning: same files loaded, no Explore or spike content, and equivalent rubric verdicts.
- **Clause 4 — Explore content:** When it runs, the saved artifact shows the problem reframed, candidate options generated before critique under the existing lane rules, at most three retained technical approaches in the Direction lane, Why-lane business alternatives kept as in `brainstorm-feature.md:25`, assumptions across risk types, and the riskiest assumption with its cheapest test. There is no fixed idea count. The card stays ≤250 words.
- **Clause 5 — Gated, tiered research spike:** The spike runs only when the recommendation depends on a fact that cannot be confirmed inside the repository (existing alternatives, prior art, market or external-technology facts) and the tier is medium or high. Quick and clear requests never trigger it; at Quick such a fact is recorded `unknown`. Each finding carries an inspected source. Deep allows a larger budget than Standard. A customer or market question the budget cannot settle follows the existing route to `discover-product` when installed; otherwise the exact capability gap is recorded. With no lookup tool available, the brief records the gap instead of guessing.
- **Clause 6 — Bounded effort:** Every spike declares its budget and stop rule before it starts and stops at either. An exhausted budget yields "not found within budget", never a filled-in answer.
- **Clause 7 — Cost recorded with quality (user-stated intent):** Each paired evaluation reports quality verdicts and cost per arm: tokens where the worker host reports them, tool calls, wall time, and recorded human minutes. Unmetered values stay `unknown`.
- **Clause 8 — Keep-or-remove rule:** A mode is kept only if open-ended scenarios improve by at least the owner-set keep threshold, clear scenarios are unchanged as defined in Clause 3, and cost per brief is within the owner-set ceiling. Both values are unknown until the baseline. A mode that fails is removed, not left dormant.
- **Clause 9 — Safety preserved:** No revised answer fabricates evidence, leaks approval authority, or lowers a risk floor; the existing critical-violation vetoes still apply.

## Relation to the approved `brainstorm-decision-quality` brief

- **Amended, for gated intake only:** its clause 3 (AC-005 in its PRD), "skip forced divergence for a clear request or sole viable path", and the current rule "0-3 options, only when a real choice exists". Under the Explore gate, candidate options are generated before deciding whether a real choice exists.
- **Unchanged:** no divergence or padded alternatives for a clear request or single viable path; at most three retained technical approaches in the Direction lane; Why-lane business alternatives as in `brainstorm-feature.md:25`; the card cap; the unknown-intent rule; approval integrity.
- **Not reintroduced:** "mandatory ten-idea output" (there is no fixed count) and "new universal thinking framework" (Explore is gated and is not applied to every intake). "Always-on agent teams" stays excluded.

## Why

- **Objective ID**: BRD-OBJ-001
- **Objective Statement**: Reduce downstream rework caused by wrong or thin direction at intake, without raising the cost of intake for requests that are already clear.
- **Baseline**: unknown. No reopen, correction, or per-brief cost data exists for the current workflow.
- **Target**: unknown — measure first. The owner sets the reopen target, the keep threshold, the cost ceiling, and the review window after Slice 1.
- **Owner**: requesting maintainer (assumed).
- **SMART Check**: specific and relevant; measurable once Slice 1 defines the measures; achievability and time bound are open until the baseline exists.

**Users:** skill consumers running intake (product owners, engineers), planners receiving the brief, maintainers reviewing briefs.

**Problem:** Intake converges well but does not widen thin ideas or look outside the repository, and nothing measures whether its direction was right.

**AS-IS:** Options appear only "when a real choice exists". Grounding reads repository files only. Research skills are opt-in and are not matched by ordinary phrasing. Evaluation covers compliance (intent fidelity, question count, card length, approval integrity).

**TO-BE:** Intake stays as cheap as today for clear requests. For open ones it explores, and where the recommendation depends on outside facts it looks outside within a declared budget. Every change carries a quality and cost comparison.

**Process diagram:** not needed; the flow is linear (frame → ground → decide → approve).

## Options And Recommendation

### Business alternatives

| Alternative | Position | Proof |
| --- | --- | --- |
| Build (this brief) | Recommended, in the measure-first form below | Paired quality-and-cost table per mode |
| Buy / substitute a third-party brainstorming pack | Not assessed in depth; would bypass SNC sizing, evidence tags, and approval states unless re-integrated | A side-by-side run on the same frozen scenarios |
| Defer | Legitimate if the baseline shows briefs are rarely reopened | Baseline reopen data |
| Do nothing | Zero new cost; the unmeasured rework risk remains | None available today |

### Option A — Measure first, then gated on-demand modes (recommended)

- What: Baseline quality and cost, then add Explore and the research spike as references loaded only on trigger, each kept or removed by Clause 8.
- Load-bearing assumption: Open-ended intake is where direction fails, and it can be detected reliably enough to gate on.
- Evidence limits: No data on how often briefs are reopened or why. Gate accuracy is untested.
- Decisive trade-off: Slower first visible change in exchange for knowing what each mode buys.
- Proof: Baseline and revised tables on the same frozen scenarios with quality verdicts and cost per arm.
- First failure condition: The gate fires on clear requests, or never fires on open ones.
- Worst plausible case: Both modes are removed after measurement; the rubric and baseline remain useful.
- Cost to abandon: Delete two reference files, their trigger lines, and their eval cases.

### Option B — Ship both modes now, measure afterwards

- What: Add Explore and the spike immediately; evaluate later.
- Load-bearing assumption: The gaps found by inspection are the ones that matter in practice.
- Evidence limits: Same as A, plus no baseline to compare against.
- Decisive trade-off: Fastest visible change; cost and benefit both unknown at release.
- Proof: None until a later evaluation; a before-state would have to be reconstructed from git.
- First failure condition: Consumers report slower or longer intake with no better briefs.
- Worst plausible case: Repeats the previous initiative, which shipped with behavioural verification pending.
- Cost to abandon: Same files as A, plus consumer-visible churn.

### Option C — Explore only, no external lookup

- What: Add Explore; keep grounding repository-only.
- Load-bearing assumption: Outside evidence rarely changes the direction.
- Evidence limits: Not tested; market-facing ideas would still be approved without looking outside.
- Decisive trade-off: Lowest runtime cost; leaves the repository-only grounding gap open.
- Proof: Paired runs show open-ended verdicts improve without any external calls.
- First failure condition: Briefs miss an existing alternative that a short lookup would have found.
- Worst plausible case: Wider option lists built on unverified claims.
- Cost to abandon: Delete one reference file and its trigger line.

**Recommendation:** Option A. Strongest objection: it spends effort on measurement before users see any change. Reversal condition: the baseline shows approved briefs are rarely reopened or corrected; then defer the modes. If the spike fails Clause 8 and Explore passes, the result is Option C.

## Cost Model

| Cost driver | Today | Control in this brief | How it is measured |
| --- | --- | --- | --- |
| Always-loaded instruction text | `brainstorm-feature.md` is 78 of 80 allowed lines; `common-decision-discipline/SKILL.md` is 96 of 100 | Only trigger lines are added, inside those limits; method goes in `references/` | `pnpm audit:sdlc`, `pnpm calculate-tokens` |
| Model tokens per brief | unknown | Clear requests stay on the current path; gated modes are compared per arm | Usage reported by the worker host for each package-level arm; `unknown` where a host reports none |
| External lookup calls | none; grounding is repository-only | Gate, tier budget, and stop rule declared up front (Clauses 5–6); values set from the baseline | Tool-call count per run |
| Multi-agent fan-out | none in brainstorm | Excluded (non-goal) | not applicable |
| Human review of the card | Card cap is 250 words; the earlier timing target was never measured | Card cap unchanged; exploration detail stays in the saved artifact | Existing timing protocol in `brainstorm-evaluation.md` §6 |
| Evaluation authoring and grading time | not recorded | Reuse the existing paired procedure and scenario categories; human grading of a sample only | Recorded minutes |
| Evaluation model spend | Eval commands start no model workers until `--execute` is given after the plan is reviewed | Review the printed plan first; use `evals:estimate` where it applies | Run record |
| Maintenance | Every new file is exported to the four configured agent hosts | Two reference files and their eval cases; no new workflow | File count in the change |
| Rework avoided (benefit) | unknown | Baseline reopen and correction counts | Slice 1 |

Limits on the measurement tools:

- The eval harness meters tokens only for its own two arms, `baseline` and `with-skill`. The paired prior-versus-revised procedure this brief reuses is package-level and separate from the harness, so its token figures must come from the host that runs each arm.
- `evals:estimate` projects a cost range only when prior usage exists for the run, and a dollar figure only when the model is in the pricing table. A first run of new scenarios may get no projection.
- On this host, a delegated worker's usage is observable: the independent check for this brief was reported at 24,411 output tokens and 1.66 USD across its two rounds. Whether other hosts expose the same is unknown.

External reference point, not a target for this project: Anthropic reports single agents use about 4× the tokens of chat and multi-agent systems about 15×, and scales effort by query complexity (one agent with 3–10 tool calls for simple fact-finding). This is why fan-out is excluded and spike budgets are tiered.

No monetary benefit or budget is established by this brief.

## Evidence

| Claim | Status | Source |
| --- | --- | --- |
| Options are limited to cases where "a real choice exists"; forced divergence is prohibited | confirmed(skills/common/common-decision-discipline/SKILL.md:59) | file read |
| The approved earlier brief lists "mandatory ten-idea output" and "new universal thinking framework" as non-goals, and its clause 3 skips forced divergence | confirmed(docs/brd/brd-brainstorm-decision-quality.md:30,36) | file read |
| Why-lane options are business alternatives; Direction-lane options are technical approaches | confirmed(skills/common/common-decision-discipline/references/option-card.md:18-19) | file read |
| Brainstorm grounding reads code, tests, docs, and specs only; no external lookup step | confirmed(.agents/workflows/brainstorm-feature.md:16-21) | file read and search |
| Named exploration techniques (reframing, assumption mapping, pre-mortem) are absent from the brainstorm, decision, and research skills | confirmed(repository search across those paths, 2026-11-11) | search miss within inspected paths only |
| Only two of ten product-management skills and no discovery workflow are configured here; four agent hosts are configured | confirmed(.skillsrc:2-6,12-16,24-57) | file read |
| A customer-evidence or market gap already routes to `discover-product` when installed | confirmed(.agents/workflows/sdlc.md:18) | file read |
| A keyword lookup for "brainstorm, product discovery, product research" returned no research skill | confirmed(`load_skills_for_keywords` response, this session) | tool output |
| Research skill evals (4, 3, and 4 cases) are guardrail and pressure cases; none is a positive research-method case | confirmed(skills/product-management/product-market-research/evals/evals.json; product-customer-discovery/evals/evals.json; product-strategy/evals/evals.json) | prompts read |
| `discover-product` has no Quick/Standard/Deep sizing | confirmed(.agents/workflows/discover-product.md) | file read |
| The previous brainstorm improvement is partially verified; human timing was not run | confirmed(docs/srs/srs-walkthrough-brainstorm-decision-quality.md:5,29,33,46) | file read |
| Workflow line limit is 80 and `SKILL.md` limit is 100 | confirmed(scripts/audit-sdlc.ts:276-277; CONTRIBUTING.md:69,95) | file read |
| Current sizes: workflow 78 lines, decision-discipline skill 96 lines | confirmed(`wc -l`, this session) | command output |
| The eval harness records token usage for the arms `baseline` and `with-skill` only | confirmed(scripts/evals/types.ts:4,45-95) | file read; not executed |
| The existing paired prior-versus-revised procedure is package-level and separate from the harness | confirmed(skills/common/common-decision-discipline/references/brainstorm-evaluation.md:21-26) | file read |
| `evals:estimate` gives a projected cost range only when prior usage exists; the dollar estimate is null unless the model is in the pricing table | confirmed(scripts/evals/index.ts:11; scripts/evals/types.ts:77-78) | file read; not executed |
| Eval commands start no model workers until `--execute` is given | confirmed(docs/EVALS.md:104-112) | file read |
| MCP session cost cannot report token usage on this host | confirmed(`get_session_cost` response, this session) | tool output |
| This host reports per-worker token usage and cost for a delegated agent | confirmed(`get_agent_status` response for the independent check, this session) | tool output; host-reported figure |
| The evidence tag already accepts a doc link, so sourced outside findings need no format change | confirmed(skills/common/common-decision-discipline/references/evidence-ledger.md:11) | file read |
| Seven approved or earlier briefs exist besides this one | confirmed(listing of docs/brd/, this session) | small sample for any historical count |
| Stepwise prompting raises the diversity of LLM idea pools; unprompted pools are less diverse than human ones | confirmed([Meincke, Mollick, Terwiesch](https://mackinstitute.wharton.upenn.edu/wp-content/uploads/2024/02/for-web-AI-idea-variance.pdf)) | abstract and findings read; one study, one domain |
| Comparing about three solutions and testing the riskiest assumption is recommended discovery practice | confirmed([Torres](https://www.producttalk.org/assumption-testing/)) | article read; practitioner guidance, not outcome proof |
| Research agents should start broad, scale effort to complexity, and be graded on accuracy, citation, completeness, and source quality; token multiples as quoted above | confirmed([Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)) | article read; their system, not this one |
| Open-ended intake is where direction fails most | assumed | no failure data; Slice 1 tests it |
| Explore and the spike improve direction enough to justify their cost | assumed | requires paired runs |
| Reopen rate, per-brief token cost, and review time today | unknown | measure first |

No product evidence ledger exists for this slug; none is created or required by this brief.

## Planner Check

**Consequential guesses and how each is handled:**

| Guess | Resolution | Owner | Affected scope |
| --- | --- | --- | --- |
| Which failure mode dominates | unknown; Slice 1 baseline decides the order of Slices 2 and 3 | maintainer | Slices 2–3 |
| Cost ceiling per brief and keep threshold for improvement | unknown; both set after the baseline | maintainer | Clause 8 |
| How reopening is measured, and what "rarely" means for the reversal | unknown. Recommended default: count history for the existing briefs first (no model spend; small sample), and simulate a planning run per scenario only with separate spend authorization | maintainer | Slice 1 scope and cost; card reversal |
| Gate definitions (Explore: open, novel, or solution-biased; spike: recommendation depends on a fact outside the repository, tier medium or high) | as stated in Clauses 3 and 5; approved with this brief on 2026-11-11 | maintainer | Clauses 3 and 5 |
| Whether intake can be classified reliably against those gates | unknown; gate accuracy is part of the paired scenarios | planner | Clauses 3 and 5 |
| Where token, tool-call, and wall-time data come from for package-level arms | host usage report per worker where available, else `unknown`; not the harness | planner | Clauses 7 and 8 |
| Where the trigger lines go | must fit the existing limits (two lines free in the workflow, four in the skill); not yet shown to fit | planner | Constraint on always-loaded text; Clauses 3 and 5 |
| Where the spike reference lives | Recommend the default-installed `common-decision-discipline` so it does not depend on opt-in skills; confirm in planning | planner | Clause 5 |

**Delegated builder decisions:** reference file names and layout, eval case IDs, exact gate wording, scenario selection within the rubric categories, report table format.

**Self-review:** every open value is marked `unknown` with an owner; one plan with three ordered slices; Clause 8 and the non-goals do not conflict (removal applies to modes, not to the measurement).

**Independent check (required at tier=high):** run 2026-11-11 by a separate read-only reviewer (profile "VMO · Analysis & Review", agent `943b0fea-f78a-41ec-b5ed-f88f9cbb0e11`), in two rounds.

- **Round 1, first draft:** CORRECTIONS REQUIRED — 2 blocking, 8 should-fix, 4 minor. Checked and found correct: card length and fields, approval integrity, numeric-evidence rule, option-card completeness, and ten repository evidence rows.
- **Round 2, revised draft:** CORRECTIONS REQUIRED — the spike-trigger finding resolved; round-1 findings 3–9 and 11–14 resolved; three items open: the "at most three" count read two ways across lanes (blocking), this record claimed resolution before it was checked (should-fix), and the card's approval line omitted gate definitions (minor).
- **After round 2:** the three open items were corrected using the reviewer's stated smallest corrections (Clause 4, the "Unchanged" line, the card's approval line, and this record). Those last corrections have not been re-reviewed.
- **Not assessed by the reviewer in either round:** external sources, this session's tool outputs (including the usage figures), the SNC score, and whether the trigger text fits the line limits.

## Slices

1. **Measure (first slice, this brief's detailed scope):** rubric, cost record, frozen scenarios drawn from real past briefs where possible, the reopen and correction count for existing briefs, and the baseline for the current workflow. No workflow or skill text changes.
2. **Explore mode:** on-demand reference, trigger line, and eval cases; evaluated against the baseline.
3. **Research spike:** on-demand reference, trigger line, tier budgets from the baseline, and eval cases; evaluated against the baseline.

Slices 2 and 3 start only after Slice 1 exists. Candidates outside this brief: research method and positive evals for the research skills, an existing-evidence mining protocol for customer discovery, packaging and trigger changes, and an adversarial pass for Deep briefs.

## Stakeholders

| Stakeholder | Role | Impact | Approval needed |
| --- | --- | --- | --- |
| Requesting maintainer (assumed sponsor and validation owner) | Approves scope; sets cost ceiling, keep threshold, and targets | Reviews briefs and evaluation results | yes |
| Skill consumers | Run intake | Wider exploration on open ideas; unchanged path on clear ones | no |
| Planners (human or agent) | Consume the brief | Fewer consequential guesses if the hypothesis holds | no |
| Host integration owners | Expose lookup tools and token usage | Determines whether the spike and cost metering work on a host | no |

## Risks

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| Gate misfires on clear requests | Higher cost and noise for routine work | Clear-request scenarios must be unchanged (Clause 3) | planner |
| Spike returns confident but wrong outside claims | Wrong direction with false support | Inspected-source rule, untrusted-data boundary, `unknown` over guesses | planner |
| Cost cannot be metered on the consumer's host | Keep-or-remove decision made on partial data | Record `unknown`; use tool calls and wall time as proxies, labelled as proxies | maintainer |
| Measurement becomes its own project | Delay with no user-visible change | Reuse the existing paired procedure and scenario categories; historical count before any simulated run | maintainer |
| Trigger lines do not fit the line limits | Modes cannot be wired without breaking a size rule | Resolve placement in planning before Slice 2; raising a limit is a separate decision | planner |
| Exploration detail leaks into the card | Review time rises | Card cap and over-cap rule unchanged | planner |
| Model-graded verdicts diverge from human judgment | False improvement signal | Human review of a sample before any keep decision; minutes recorded | maintainer |

## Glossary

| Term | Meaning |
| --- | --- |
| Direction quality | Whether the approved brief framed the right problem and option, judged by the Clause 2 rubric |
| Reopen | A material change to an approved brief forced by planning or delivery |
| Explore mode | On-demand reframing and option generation for open, novel, or solution-biased intake |
| Research spike | A bounded external lookup inside the Ground step, with declared budget and stop rule |
| Arm | One side of a paired evaluation (current versus revised) |
| Cost per brief | Tokens where reported, tool calls, wall time, and recorded human minutes for one intake run |
| Keep threshold | The owner-set minimum improvement on open-ended scenarios needed to keep a mode |

## PRD Hand-off Notes

- Candidate requirement links for BRD-OBJ-001: REQ-001 direction-quality and cost baseline; REQ-002 gated Explore mode; REQ-003 gated research spike. These are candidates; `plan-feature` owns the canonical requirements and acceptance criteria.
- Open decisions for planning: cost ceiling, keep threshold, reopen measurement method and target, review window, scenario source, trigger placement, spike reference location.

## Approval

approval: approved(requesting maintainer, 2026-11-11); scope: this brief only; reopen: affected section only
evidence: the maintainer replied "ok" to the presented Decision Card. Approved revision SHA-256 (file bytes before this approval record was added): `678bbdbf4a0648930e12e60fe0f2ecbf929eb200fe045d5d8ca39f7f0e318791`.
covers: the direction, scope, cost rules, gate definitions, the amendment to the real-choice rule, and the drafted owner default.
authority: planning handoff only. No implementation, deployment, model spend, merge, release, or runtime activation. The cost ceiling, keep threshold, reopen target, and review window remain unset owner decisions.
known limit at approval: the three corrections made after review round 2 were not re-reviewed.

## Outcome Report

```json
{"schema_version":1,"run_id":null,"slug":"brainstorm-research-quality","workflow":"brainstorm-feature","feature_status":"requirements_ready","started_at":"2026-11-11T08:21:54Z","completed_at":"2026-11-11T09:16:05Z","requirement_trace":{"brd_objectives":["BRD-OBJ-001"],"requirements":["REQ-001","REQ-002","REQ-003"],"acceptance_criteria":[],"srs":[]},"completed_evidence":["current-workflow-and-skill-inspection","external-practice-comparison","cost-constraint-inspection","independent-planner-check-round-1","independent-planner-check-round-2","human-brief-approval-2026-11-11"],"missing_evidence":["re-review-of-round-2-corrections","reopen-and-correction-baseline","per-brief-cost-baseline","gate-accuracy","trigger-placement-within-line-limits"],"decision_needed":[],"recommended_next_workflow":"plan-feature","cost":{"source":"unavailable"},"agent":{"identity":"orchestrator","model":"anthropic/claude-fable-5-2"}}
```

## Next Workflow

`plan-feature`, on the approved scope only. `requirements_ready` describes this approved intake brief, not an approved plan or any execution authority.

## Cost Report

`get_session_cost(workflow="brainstorm-feature")` was called. Orchestrator token usage and pricing were not exposed; total session cost is unavailable. The independent check was host-reported at 24,411 output tokens and 1.66 USD across two rounds. No model evaluation, build, or test was run for this brief.
