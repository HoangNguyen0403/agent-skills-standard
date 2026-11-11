# Brief: Improvement Criteria and Expert Judgement for Agent Skills Standard

slug: ags-improvement-criteria
operator_profile: hybrid
lane: both
snc_tier: high
model_tier: strong
approval: approved(requesting maintainer, 2026-11-11)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=1 C=2 total=5 tier=high (inference). Spread covers skills, evals, MCP retrospective and workflows; centrality is rounded up because the retrospective engine sits on a consent/privacy boundary. The capability hint authorizes no premium spend.

Source revision inspected: `28140c6a09cc429148af67edd254f57de0958dac`, clean tree.

## Decision Card

- **Outcome:** One agreed set of criteria for judging improvement in three lanes (skill quality, retrospective measurement, SDLC × ADLC), an evidence-based judgement of where the project stands, and a ranked list of slices small enough to brief to cheaper agents.
- **Judgement:** Activation is strong. Outcome quality is uneven. The learning loop records findings but has promoted none. Delivery metrics have calculators but no observations in this checkout.
- **Recommendation:** Fix measurement validity before fixing skills. Start with two slices that need no model spend: eval-assertion triage (SL1) and a learning-item ledger with a closure check (SL3).
- **Strongest objection:** Triage delays visible skill fixes. Reversal condition: if triage shows most failures are genuine skill defects, go straight to remediation waves.
- **Impact if wrong:** Cheap agents rewrite skills to satisfy substring assertions, and scores rise without behavior changing.
- **Open decisions:** first-slice choice, meaning of ADLC, account domain for delegation (see Open Questions).
- **Approval sought:** this brief only. It grants no planning, implementation, eval spend or release authority.

## You Said / I Assumed

**You said:** Decide which criteria to consider for improving agent-skills-standard: quality of skills, better retrospective measurement, and improving SDLC × ADLC. Explore improvements and their benefits. An improvement plan for cheaper agents comes afterwards; a detailed expert judgement comes first.

**I assumed:**

- ADLC means the lifecycle of the skills and agents themselves (author, evaluate, release, observe, learn, retire). The term does not appear in `docs/`, `ARCHITECTURE.md`, `README.md`, `CONTRIBUTING.md` or `skills/common`.
- This brief extends the approved `docs/brd/brd-skill-system-effectiveness.md`. That brief's first slice (pilot evidence readiness) and its approval stay as they are.
- Sponsor and decision-maker: requesting maintainer (proposed, not an appointment).
- Success example (agent-proposed): a cheap worker receives a slice brief, delivers it, and one named criterion moves on a same-protocol rerun or a deterministic check.
- Anti-goal (agent-proposed): raising eval pass rates by editing skill wording to echo assertion strings.

## Contract

**Outcome:** as in the Decision Card.

**Constraints:** Reuse existing evaluation, metrics, retrospective and learning mechanisms. Keep report populations separate. Unknown values stay unknown. Retrospective privacy invariants (local only, zero model calls, human-only consent) do not change under this brief.

**Non-goals (assumed):** new skills or categories; a new evaluation platform; changes to host enforcement; automatic promotion of learnings into `AGENTS.md` or policy; any ROI or savings claim.

**Acceptance criteria (all assumed):**

1. Each lane has named criteria with a measure, an existing source and a current value or an explicit `unknown`.
2. Each judgement cites the artifact that supports it.
3. Each improvement candidate states maintainer benefit, user benefit, proof, and whether it needs model spend or a design step first.
4. Slice candidates carry enough bounds (files, proof, exclusions) to become worker briefs in `plan-feature`.
5. No numeric target is set without a supplied or confirmed source; otherwise the proof is `measure first`.

## Criteria

Thresholds are stated only where the repository already uses one. Everything else is `measure first`.

### Lane A: Skill quality

| ID | Criterion | Measure and source | Current value |
| --- | --- | --- | --- |
| Q1 | Outcome lift | With-skill minus baseline case pass rate, same protocol (`evals-report.md`) | 42% to 72%, 30 points, composite protocol |
| Q2 | No harm | Count of skills where with-skill scores below baseline | 16 skills |
| Q3 | Dead skills | Count of skills at 0% baseline and 0% with-skill | 16 skills |
| Q4 | Activation precision | Skills meeting the existing 90% recall and specificity gate | 226/265 |
| Q5 | Assertion validity | Semantic validity requires human adjudication; lexical task anchoring is a triage heuristic, not validity proof | Semantic-invalidity rate unknown. Retained-run heuristic flags: 241/1,456 failed assertions across both arms; 85/525 with-skill failures; 39/146 with-skill failures within the 32 weak skills. |
| Q6 | Evidence provenance and coverage | Resolved protocol contributors; categories with a live run | 227 unresolved; 22 of 27 category directories |
| Q7 | Context cost | Tokens per skill load (`benchmark-report.md`) | 594 average |
| Q8 | Real-task efficacy | Executable (L3) accepted-task outcome | unknown, lane not run |

### Lane B: Retrospective measurement

| ID | Criterion | Measure and source | Current value |
| --- | --- | --- | --- |
| R1 | Coverage | Share of child agents linked; hosts with a session reader | about 313 of 342 unlinked in pilot data; omp and codex only |
| R2 | Actionability | Findings converted to an improvement item with a mechanism | unknown, measure first |
| R3 | Closure | Unique candidates with a recorded promoted or retired state | 19 unique candidates from 22 candidate-bearing entries, all `proposed`; 0 recorded promoted. Initial brief counted occurrences as candidates. |
| R4 | Verification | Recorded evaluation references, separating entries from unique candidates | Historical count: 18 entries marked `not-run`; current deduplicated ledger: 16/19 candidates without a concrete evaluation reference. Reference presence does not establish executed verification. |
| R5 | Recurrence | Repeated candidate IDs; semantic root-cause grouping remains unmeasured | 3 IDs have two occurrences each; stable candidate/occurrence links are now exposed by the ledger. |
| R6 | Adherence | Skill returned versus skill followed | not assessable by design |
| R7 | Privacy guardrail | Consent, local-only and zero-model-call invariants hold | holds per docs; must not regress |

### Lane C: SDLC × ADLC

| ID | Criterion | Measure and source | Current value |
| --- | --- | --- | --- |
| S1 | First-pass acceptance | `scripts/metrics/delivery.ts` over delivery observations | unknown, no observations file found |
| S2 | Correction rounds per accepted change | same | unknown |
| S3 | Human review minutes per accepted change | same | unknown |
| S4 | Cost per accepted change | `get_session_cost` plus host usage | unavailable; actor coverage incomplete |
| S5 | Ceremony proportionality | Artifacts and approvals produced per SNC tier | unknown, measure first |
| S6 | Delegation fitness | Corrective follow-ups per cheap-worker slice | unknown, measure first |
| A1 | Lifecycle state coverage | Skills with one explicit state (draft, evaluated, release-ready, deprecated) | 113/265 strict release-ready; no single state field found |
| A2 | Finding-to-prevention lead time | Learning-log date to verified mechanism | unknown; no promoted item to measure |
| A3 | Retirement | Skills retired or merged on evidence | 1 removed since v2.6.0 |

## Expert Judgement

**Lane A.** Selection works: recall 99.62%, specificity 94.14%. Outcome evidence is weaker than the headline suggests, for three reasons. First, the structural score is saturated (9.8/10, 96% of skills at 9 or above), so it cannot rank skills. Second, eval assertions are mostly substring checks written from the skill text (99% eval–skill consistency); the failing-assertion list includes bare tokens such as `contains:Android`, `contains:React` and `contains:Docker`, which test wording, not behavior. Third, 227 of 265 contributors have unresolved protocol provenance, so the 30-point lift cannot be certified as one comparison. The 32 skills under Q2 and Q3 are the place to look first, but until Q5 is measured nobody can say whether they are bad skills or bad assertions.

**Lane B.** The retrospective documentation specifies local, deterministic, consent-gated preparation; this slice does not certify that engine. The learning log contains 26 entries: 4 legacy entries and 22 candidate-bearing entries representing 19 unique candidate IDs, all currently `proposed`. The initial brief incorrectly equated candidate-bearing entries with unique candidates. The new ledger reports 18 candidates without a concrete mechanism and 16 without a concrete evaluation reference; historical text separately records 18 `Evaluation: not-run` entries. These are recorded metadata, not proof that preventive work was or was not performed elsewhere. Coverage caveats remain: most child agents were unlinked in the documented pilot, and the cited retrospective guide supports omp/codex readers rather than Claude/Gemini stores.

**Lane C.** The SDLC surface is broad (39 workflows) and the metric calculators exist, but no `artifacts/metrics/delivery-observations.json` and no `docs/ops/bands.yaml` were found in this checkout. A search miss is not proof of absence elsewhere. As it stands, no delivery criterion can be reported as measured, so workflow changes cannot be judged. For ADLC, the pieces exist (skill-creator, battle-test, evals, benchmark gate, release scripts, retro-learn) without one visible state per skill or an evidence-based retirement rule.

**Overall.** The binding constraint is measurement validity, not catalog size or workflow count. Improving skills before Q5 and R3 are fixed risks optimizing numbers that do not track behavior.

## Evidence

| Claim | Status |
| --- | --- |
| 265 skills, 22 categories; 133 outcome-ready, 226 activation-ready, 113 strict release-ready; catalog NOT READY | confirmed(evals-report.md, Executive Summary) |
| Baseline 42%, with-skill 72%; recall 99.62%, specificity 94.14% | confirmed(evals-report.md, Executive Summary) |
| 227 unresolved protocol contributors; tool-free execution unverified | confirmed(evals-report.md, header and summary) |
| 16 skills with negative delta | confirmed(evals-report.md, "Skills Where With-Skill Underperformed Baseline") |
| 16 skills at 0% baseline, 0% with-skill | confirmed(row count over evals-report.md per-skill table, this session) |
| Failing assertions include bare-token `contains` checks | confirmed(evals-report.md, failing-assertion table) |
| 288 skills benchmarked; 9.8/10 structural; 96% at 9 or above; 594 tokens average; 99% eval–skill consistency | confirmed(benchmark-report.md:21-31) |
| 27 category directories; cybersecurity, marketing, product-management, specialists, system-design absent from the per-category table; cybersecurity has separate runs | confirmed(skills/ listing; evals-report.md run history) |
| Remediation queue holds 55 items | confirmed(benchmarks/evals/remediation-queue.json) |
| 26 learning entries: 18 session retrospective, 8 user correction; 22 candidate-bearing entries deduplicate to 19 unique candidates, all `proposed`; 18 historical `Evaluation: not-run` entries; 17 "None established" trigger misses | confirmed(AGENTS_LEARNING.md counts; integrated learning:ledger output). Initial occurrence-versus-candidate counting error corrected. |
| Retrospective is local, deterministic, consent-gated; "returned is not followed"; about 313 of 342 child agents unlinked in pilot data | confirmed(docs/session-retrospective.md:1-25,230-243) |
| Default source roots are omp and codex; Claude and Gemini stores are presence-disclosed only | confirmed(docs/session-retrospective.md:62-75) |
| No delivery observations file or control bands file | unknown beyond this checkout: `artifacts/` and `docs/ops/` not present |
| Task economics withheld for lack of per-attempt usage | confirmed(evals-report.md, Task Economics) |
| The improvements below reduce rework or cost | assumed; no measurement exists |

## Options And Recommendation

| Option | Load-bearing assumption / first failure | Worst case / cost to abandon | Decision |
| --- | --- | --- | --- |
| 1. Validity first, then targeted fixes | A meaningful share of failures are assertion defects; fails if triage finds almost none | Some triage effort spent before skill fixes; low, outputs stay useful as a remediation list | Recommended |
| 2. Remediate the 32 weak skills now | Current assertions measure behavior; fails if skills are tuned to echo strings | Scores rise without behavior change; medium, edits must be re-reviewed | Not first |
| 3. Build delivery-metrics capture first | Maintainers will record observations consistently; fails if nobody supplies them | Empty pipeline; medium | Later, after slice 1 |

Proof for option 1: a committed triage table classifying every failing assertion for the 32 skills as skill defect or assertion defect, plus a check that rejects a learning item lacking a mechanism and verification reference.

## Improvement Candidates And Benefits

Benefits are hypotheses until measured.

| ID | Slice | Maintainer benefit | User benefit | Proof | Cheap-agent fit |
| --- | --- | --- | --- | --- | --- |
| SL1 | Classify failing assertions for the 32 Q2/Q3 skills using the existing `evals:audit` tooling | Know whether to fix the skill or the eval | Fewer misleading readiness claims | Committed triage table; counts reproduce from the report | Yes; no model spend; needs independent adjudication of a sample |
| SL2 | Repair confirmed assertion defects with behavioral assertions | Scores start tracking behavior | More trustworthy published numbers | Real scorer rejects an echo-only answer and accepts a correct paraphrase | Yes, per category |
| SL3 | Structured ledger of the 22 learning candidates (root cause, mechanism, verification, status, age) with a deterministic check | See which lessons are stuck and why | Fewer repeated mistakes once items close | Check fails on a fixture item without mechanism or verification | Yes; no model spend |
| SL4 | Remediate confirmed skill defects from SL1 in category waves | Work goes to observed failures | Better guidance in weak categories | Same-protocol rerun shows no negative delta | Yes, but reruns need separate spend authorization |
| SL5 | Delivery-observation capture template and a working `metrics:report` run | First measured S1–S3 values | Evidence that workflows help | Report runs on a real observation set and labels coverage | Yes |
| SL6 | Retrospective counters for agent linkage and loop closure | See coverage gaps per session | none direct | Deterministic fixture tests; privacy table unchanged | No, design-solution first (privacy boundary) |
| SL7 | Derived per-skill lifecycle state in the evals report | One state per skill; retirement candidates visible | Clear label of tested versus untested skills | Report regenerates deterministically | Yes |
| SL8 | Resolve protocol provenance with fresh same-protocol runs | Certifiable aggregate comparison | Credible lift number | Unresolved contributors reach zero for the rerun scope | Needs spend authorization |

Suggested order: SL1 and SL3 together, then SL2, SL7, SL5, then SL4 and SL8 once spend is authorized, and SL6 after a design step.

## Planner Check

- Placeholders and contradictions: none found on self-review.
- Multi-plan scope: eight candidates listed; only SL1 and SL3 are proposed for the first plan.
- Independent check (required at this tier): not run. The maintainer chose to proceed to planning without it on 2026-11-11.
- Overlap: SL1, SL2 and SL4 refine P1 of the approved effectiveness brief; SL3 refines its P2 learning-loop item; SL5 refines its P2 cost item. No approved decision is reopened.

## Open Questions

1. **First slice.** Settled by approval: SL1 plus SL3, no model spend. SL4/SL8 still require a separate spend authorization.
2. **ADLC.** Settled by approval: skill and agent lifecycle as assumed above.
3. **Account domain for delegation.** Settled by the maintainer on 2026-11-11: Personal.

## Approval

approval: approved(requesting maintainer, 2026-11-11) through the explicit reply "ok" to this brief's approval request; scope: this brief only, including the SL1 + SL3 first slice and the ADLC reading; reopen: affected section only.
authority: initial brief approval granted planning handoff only. Subsequent explicit “start process it” authorized the presented SL1 + SL3 implementation under the selected Subagent-Driven approach; see the approved PRD. No paid evals, merge, release or runtime activation authorized.

## Outcome Report

```json
{"schema_version": 1, "run_id": "unknown", "slug": "ags-improvement-criteria", "workflow": "brainstorm-feature", "feature_status": "requirements_ready", "approval": "approved(requesting maintainer, 2026-11-11)", "started_at": null, "completed_at": null, "requirement_trace": {"brd_objectives": [], "requirements": [], "acceptance_criteria": [], "srs": []}, "completed_evidence": ["criteria per lane with current values", "retained-run task-anchoring triage", "deduplicated learning ledger and local integrity checks"], "missing_evidence": ["semantic assertion validity rate", "delivery observations", "real-task efficacy", "remote CI execution"], "decision_needed": [], "recommended_next_workflow": null, "cost": {"source": "unavailable"}, "agent": {"identity": "omp orchestrator", "model": "openai-codex/gpt-6.1-sol"}}
```

## Next Workflow

`plan-feature` for SL1 and SL3.
