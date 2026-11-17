# Feature Plan: Agent Review Trust

slug: agent-review-trust
revision: 2
operator_profile: technical
lane: direction
delivery_mode: extended
snc_tier: high (S=2 N=2 C=2; inference: cross-skill, new behavior, review and approval gates are core)
model_tier: strong (capability hint only; host profiles are resolved at dispatch)
approval: maintainer accepted D1/D2 and DD-1/DD-2/DD-3; Fable 5.2 technical APPROVE for revision 2 plan (agent 4de1e8f7-e109-41b1-85e9-d8cf1322048c); implementation still conditional on design/readiness; no publication/release authority
owner: requesting maintainer
repository_status: planned
activation_status: not_assessed

## Decision Brief

- **Changes since revision 1:** addresses Fable findings M-1 through M-8 and minor comments: isolated verification, frozen blind-phase receipts, base-policy authority, complete refusal cases, preserved default review, parsed rollback fields, explicit metrics populations, and fail-closed launch audit.
- **Recommendation:** Three independently revertible milestones. M1 improves review and reporting; M2 adds conservative class-based checks; M3 adds calibration and launch audit. No milestone activates report-only automatically.
- **Impact if wrong:** A weaker human gate lets a core defect merge on an agent's word. Human merge approval remains mandatory; core, sensitive and one-way changes retain line review.
- **Evidence and limitations:** Source inspection and plan-structure checks are not model-behavior evidence. Blind review is a declared protocol, not host-enforced file isolation. Eval-lane criteria remain `NOT RUN` until an authorized live run; offline preflight proves structure only.
- **Resolved decisions:** D1/D2 and DD-1/DD-2/DD-3 below are maintainer decisions, not reviewer approvals. No material choice is delegated to the reviewer.
- **Authority:** The maintainer authorizes Subagent-Driven implementation only after Fable technical approval and the applicable technical design/readiness gate. No paid live eval, merge, publication, deployment or release is authorized.
- **Ready work:** Design and prerequisite assessment may proceed after plan approval; implementation waits for design confirmation of C2/C3/C4 for M1, C1/C5 for M2, and C6 for M3.

## Outcome And Guardrails

Outcome: eventually the human may read one Delivery Report instead of the diff for an explicitly granted eligible class. That report-only outcome is not activated by this implementation: this work supplies conservative review, proof checks and calibration, while DD-3 keeps grants disabled pending independently checked real evidence and human approval.

Measurement (M3, per change class, from authorized delivery observations): share of agent-approved changes where a human later found a Blocker or Major; seeded-defect recall of the reviewer; escaped defects; human review effort per accepted change. No target number is set here; the policy owner sets thresholds in `docs/review-policy.md`. Missing data is `unavailable`, never zero.

Guardrails that must not regress:

- A human approves every merge; the agent never approves its own change (`common-review-policy` section 6).
- The sensitive-change floor, HARD STOP at `tier=high`, and explicit human authorization for irreversible actions.
- Technical verification, business acceptance and release stay separate decisions.
- Reversibility and change class never lower an SNC tier; they only select what the human must read.
- No new document, intake or approval for low-risk `brief` work. The accepted D1 field applies to every existing SDD task brief, including brief-mode tasks; it adds no SDD plan where none was required.
- Workflow files stay within their audited line caps; `SKILL.md` stays at or below 100 lines.

## Scope And Non-Goals

Scope fence: canonical skills under `skills/common/`, `skills/product-management/product-requirements/references/feature-slicing.md`, `skills/specialists/specialist-pr-reviewer/`, canonical workflows in `.agents/workflows/`, repository metrics scripts, the pull request template, one new project policy file, and their generated exports.

| Capability | Gap | Disposition | Milestone |
| --- | --- | --- | --- |
| Blind, adversarial review with reproduced evidence | 1 | In scope | M1 |
| Gate, control invariant and rollback declared per slice | 3 | In scope | M1 |
| One decision-first Delivery Report and a matching PR template | 4 | In scope | M1 |
| Findings name their preventing mechanism; static gate before review | 6 | In scope | M1 |
| Deterministic change class and human review level | 2 | In scope | M2 |
| Deterministic gate that refuses an unsupported "ready" report | 8 | In scope | M2 |
| Per-class trust measurement and owner-recorded graduation | 5 | In scope | M3 |
| Whole-feature launch audit and staged exposure | 7 | In scope | M3 |
| Auto-merge or agent-granted approval | - | Excluded | - |
| Host-level enforcement (branch protection, actor authentication) | - | Excluded; host responsibility, documented as a limit | - |
| Requiring `review_gate.py` as a CI check in this repository | 8 | Deferred (D4) | - |
| Live eval runs, release tagging, publication | - | Excluded; separately authorized | - |

## Requirements And Acceptance Criteria

No BRD objective IDs exist; every requirement traces to the session request above.

| Requirement | Behavior | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-ART-01 | The independent reviewer forms findings before seeing the implementer's narrative and reproduces evidence itself | Maintainer | P0 | Proposed |
| REQ-ART-02 | Human review depth is derived from changed paths and declared reversibility, not from an agent's self-score alone | Maintainer | P0 | Proposed |
| REQ-ART-03 | Every planned slice declares its gate, control invariant and rollback before code starts | Maintainer | P1 | Proposed |
| REQ-ART-04 | The human receives one decision-first Delivery Report and a PR description that say where to look and what is unverified | Maintainer | P0 | Proposed |
| REQ-ART-05 | Reviewer trust is measured per change class, and only the policy owner widens or narrows autonomy | Maintainer | P1 | Proposed |
| REQ-ART-06 | Review findings feed deterministic prevention, and review tokens are not spent on a revision that fails deterministic checks | Maintainer | P1 | Proposed |
| REQ-ART-07 | Before human acceptance the whole feature is attacked by fresh-context agents, and gated features are exposed in stages | Maintainer | P2 | Proposed |
| REQ-ART-08 | A deterministic gate refuses a "ready" Delivery Report that lacks its required receipts | Maintainer | P0 | Proposed |

| AC | Requirement | Given / when | Observable result | Owner | Single verification lane |
| --- | --- | --- | --- | --- | --- |
| AC-ART-01 | REQ-ART-01 | A task or branch reviewer is dispatched | Phase one gets the brief, diff and orchestrator-observed check receipt only; findings are frozen with a digest before supplying author claims. A deterministic dispatch-template check excludes the report placeholder; model compliance remains a live-eval claim | Skill owner | Dispatch contract test plus separately authorized skill eval |
| AC-ART-02 | REQ-ART-01 | Reviewer reproduction is requested | Execution requires verified provenance, host-verified isolation without credentials/publication authority, and an orchestrator-published command. Never run in a privileged reviewer runtime. Otherwise record static-only plus a gap; mismatched claimed/observed results are Blockers | Skill owner | Separately authorized skill eval |
| AC-ART-03 | REQ-ART-01 | A reviewer writes its output | Findings use Blocker, Major, Nit only; there is no praise section | Skill owner | Skill eval case |
| AC-ART-04 | REQ-ART-02 | `review_gate.py classify` receives a policy and changed paths | It returns the highest matching class; an unmapped path is `shared`; a missing map is `unclassified`; a malformed map exits 2 | Script owner | Python unit tests |
| AC-ART-05 | REQ-ART-02 | A change touches a trunk path, is one-way, or hits the sensitive floor | Human line review is required whatever the SNC arithmetic; reversibility never lowers the tier | Skill owner | Skill eval case |
| AC-ART-06 | REQ-ART-03 | `task_brief.py` reads a task section | Missing, empty, fenced-only, bare `none`, absent control/rollback, invalid reversibility, or one-way without authorization rejects with exit 2 and publishes nothing; justified none with complete fields is accepted | Script owner | Python unit tests |
| AC-ART-07 | REQ-ART-03 | A plan is sliced and assessed for readiness | Each slice carries gate, control invariant and rollback; a one-way rollback without a human authorization reference blocks that slice only | Workflow owner | SDLC workflow audit plus independent review |
| AC-ART-08 | REQ-ART-04 | An implementation handoff is produced | It opens with the Delivery Report decision block: verdict, human action, review level, human-attention hunks, criteria with proof, verified and not verified, gate and rollback, open findings | Skill owner | Skill eval case |
| AC-ART-09 | REQ-ART-04 | A pull request is opened or its metadata is reviewed | The template has evidence, blast radius, rollback and not-verified sections, and `specialist-pr-reviewer` reports each missing one | Skill owner | Specialist eval case |
| AC-ART-10 | REQ-ART-05 | Metrics receives approved C6 observations | Per-class agent-review miss share, independent seeded-review recall and deployment escapes use distinct explicit populations, domain identities and complete per-kind coverage; unclassified changes remain in an unknown bucket, not silently excluded | Script owner | Metrics test suite |
| AC-ART-11 | REQ-ART-05 | A class's review level would change | No first report-only grant before independently checked complete M3 calibration/outcome evidence, owner-set thresholds and explicit owner grant. An observed post-grant escape suspends that grant pending owner review; the default review is not weakened | Skill owner | Separately authorized skill eval |
| AC-ART-12 | REQ-ART-06 | A review starts on a revision whose defined lint, type or test checks failed | The verdict is CHANGES REQUESTED for the deterministic failures without lens review; unknown status is an evidence gap. Every finding carries `Prevent-by` | Skill owner | Skill eval case |
| AC-ART-13 | REQ-ART-06 | A Blocker recurs across reviews | The policy routes it to `retro-learn`, which prefers a deterministic check, then a test, then an eval, with guidance last | Skill owner | Skill eval case |
| AC-ART-14 | REQ-ART-07 | A medium/high feature is verified | Applicable launch-audit lanes run independently; FAIL prevents technical PASS; missing required proof is BLOCKED and never routes to UAT. Only justified NOT APPLICABLE lanes may be omitted | Workflow owner | Workflow contract review and scoped runtime proof |
| AC-ART-15 | REQ-ART-07 | A release carries a declared gate | Promotion is staged through the gate with guardrail observation before full exposure; without a gate the existing path is unchanged | Workflow owner | SDLC workflow audit plus independent review |
| AC-ART-16 | REQ-ART-08 | `review_gate.py check` reads a report | It exits non-zero naming the reason for each refusal case in the task list | Script owner | Python unit tests |
| AC-ART-17 | REQ-ART-02 | This repository's policy is classified against a diff touching `.github/workflows/ci.yml` | The class is `trunk` | Integration owner | Consumer smoke |
| AC-ART-18 | REQ-ART-08 | Each milestone freezes | Source/export integrity, size caps and required deterministic gates pass; behavioral evals not executed remain NOT RUN and no full verification or efficacy claim follows from structure checks | Integration owner | Integration gate |

## Recorded Consequential Decisions

| Decision | Recommended default | Owner | Affected slice | Required input |
| --- | --- | --- | --- | --- |
| D1 (accepted): required gate field | Required for all SDD task briefs, including existing brief-mode plans; justified none must still include control, rollback and parseable reversibility. No new document requirement for non-SDD brief work. | Maintainer | Task 2 | Resolved in session |
| D2 (accepted): report-only meaning | Human reads the report instead of the diff and still approves merge; only leaf, reversible and explicitly owner-granted; never trunk, one-way or sensitive. | Maintainer | Tasks 6, 7 | Resolved in session |
| D3 (retained): live eval spend | No paid live eval authorized. Added cases and offline preflight are structural checks; eval-lane behavior remains NOT RUN and no grant may rely on it. | Maintainer | Tasks 5, 9, 13 | Separate approval for a live run |
| D4 (retained): CI enforcement | Script, tests and recipe only; no required delivery-gate CI activation or branch-protection change. Declaration checks cannot authenticate actors or human grants. | Maintainer | Task 9 | Separate activation approval |
| DD-1 (accepted): reviewer execution | Verified provenance AND host-verified isolated runtime without credentials/publication authority AND orchestrator-published command; otherwise static review and explicit gap. Technical design precedes M1. | Maintainer | Tasks 1, 2, 4 | Resolved; design realizes the predicate |
| DD-2 (accepted): human-review default | Absent owner-approved policy, preserve current human review. Hunk lists are minimum attention and include reviewer nominations and every finding-bearing file, never a reading limit. | Maintainer | Tasks 2, 6, 7 | Resolved |
| DD-3 (accepted): first report-only grant | Disabled until complete independently checked M3 calibration/outcome evidence, owner-approved thresholds and explicit human grant; missing data and declarations alone never qualify. | Maintainer | Tasks 6, 7, 10 | Resolved; no grant in this implementation |

## Delivery Plan

Task briefs with owned paths, invariants and verification commands are in [the task list](../srs/srs-task-list-agent-review-trust.md). Sizes are comparative, not dates.

| Milestone | Tasks | Delivers | Depends on | Rollback |
| --- | --- | --- | --- | --- |
| M1 Review quality | 1-5 | AC-ART-01, 02, 03, 06, 07, 08, 09, 12 | Plan approval; design for C2/C3/C4 and DD-1; readiness | Revert the milestone PR; consumers stay on pinned refs |
| M2 Class-based gate | 6-9 | AC-ART-04, 05, 11, 13, 16, 17 | M1 accepted source checkpoint; design for C1/C5, base-policy authority, rename/hunk coverage, generated trunk files and Git-derived identity | Revert the PR; absent policy preserves current review |
| M3 Trust and launch | 10-13 | AC-ART-10, 14, 15 | M2 accepted source checkpoint; design for C6 populations, coverage and identities plus launch-audit failure routing | Revert the PR; old observation exports remain valid |

Each milestone produces a PR-ready source checkpoint with whole-branch independent review. Publishing or merging a PR requires separate human authority and is not a prerequisite for locally building a later milestone on its accepted source checkpoint. Review includes the relevant `specialist-architecture-guard` and `specialist-security-reviewer` lenses in independent eligible contexts for this high-tier change. AC-ART-18 is checked at every milestone; no agent supplies human acceptance.

## Evidence

- `confirmed(skills/common/common-subagent-driven-development/references/templates.md:145-161,179)`: the reviewer is told to read the implementer's report, not to re-run tests, and to list strengths.
- `confirmed(skills/common/common-task-complexity-routing/SKILL.md:33-37,76)`: the tier is scored from Spread, Novelty and Centrality by inference; there is no path map and no reversibility input.
- `confirmed(.agents/workflows/plan-feature.md:27-29)`: slice mapping names no gate or rollback. `confirmed(skills/common/common-subagent-driven-development/scripts/task_brief.py:73-82)`: the brief contract has no such field.
- `confirmed(.github/pull_request_template.md:1-14)`: the template has root cause, related PR and solution only.
- `confirmed(skills/common/common-sdlc-metrics/references/metrics-schema.md:84-93)`: observation kinds carry no change class, human-finding or seeded-review data.
- `confirmed(.agents/workflows/code-review.md:54)`: finding rows have no preventing-mechanism field. `confirmed(skills/common/common-review-policy/SKILL.md:61)` versus `confirmed(.agents/workflows/retro-learn.md:19)`: the two disagree on where a recurring Blocker goes.
- `confirmed(.agents/workflows/sdlc.md:36)`: a verification pass routes straight to human acceptance.
- `confirmed(skills/common/common-subagent-driven-development/references/progress-receipts.md:3)`: receipt owner identity is declared, not authenticated. The M2 gate inherits this limit.
- `confirmed(scripts/audit-sdlc.ts:268-360)`: `implement-feature`, `plan-feature`, `code-review`, `verify-work`, `deploy-release` and `retro-learn` are capped at 80 lines; three of them are at the cap now, so workflow edits replace text in place and detail goes to skill references.
- Planning checks: all 13 task sections passed the existing brief-contract validator; scoped and repository trace audits exited 0 (unlinked-BRD warnings). No live behavioral eval or implementation check has run. Recheck revised task contracts and trace after revision 2.

## Risks

| Risk | Owner | Disposition |
| --- | --- | --- |
| A reviewer on the same model as the author shares blind spots | Maintainer | Prefer a different eligible family only where host/profile policy permits; never override account eligibility, profile settings or premium approval. Actual configuration is recorded. |
| Blind review is a declared protocol, not a filesystem sandbox | Maintainer | Freeze phase-one findings before claims are supplied; never infer that omitted report paths make files inaccessible. Unsupported resume blocks reconciliation rather than faking continuity. |
| The gate is treated as authenticated enforcement | Integration owner | Base-policy and Git identity checks reject self-relaxation, but actors, receipts and grants still need independent host/human validation; D4 remains deferred. |
| Skill or workflow changes exceed caps | Implementation owner | In-place replacement and references; SDD is at 96 lines and routing at 99. Never raise caps or hide obligations to fit. |
| A required brief field breaks existing consumer plans | Maintainer | D1 |

## Status And Receipt

- `feature_status`: `requirements_ready`; revision-2 plan technically approved by Fable, design/readiness pending. Cosmetic approval bookkeeping and Fable's three nits do not change the reviewed scope or human decisions.
- Run record: none written. A run record is added only when a workflow run is authorized.

## Next Workflow

- All milestones: `design-solution` then `implementation-readiness` for the named scope.
- M1 outputs: C2 parser grammar and migration, C3 isolation/receipt/freeze/resume protocol, and C4 report semantics before class gating exists.
- M2 outputs: C1/C5 base-policy trust, immutable trunk controls, rename old/new paths, complete trunk-hunk coverage, independently derived Git/dirty identity, generated-trunk treatment and mixed-class review semantics.
- M3 outputs: C6 agent-review denominator, independent seeded cohort, deployment-to-class join, unknown-class bucket, per-kind coverage/identity/deduplication, reviewer configuration, post-grant escape trigger, and launch FAIL/BLOCKED routing.
