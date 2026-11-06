# Feature Plan: Decision and Evidence Fidelity

slug: critical-thinking-agent-workflows
operator_profile: hybrid
lane: both
snc_tier: high
model_tier: strong
delivery_mode: extended
approval: approved(requesting maintainer, 2026-11-05)
source_approval: approved(requesting maintainer, 2026-11-05)
repository_status: approved_plan_saved
activation_status: not_required

## Decision Brief

- **Changes since approved revision:** Initial PRD derived from the approved BRD; scope remains its first slice, decision/evidence fidelity. Requirements below make its proposed behavior testable; they do not authorize implementation or expand into human training.
- **Recommendation:** Strengthen selected decision/evidence controls and adversarial evaluation inside existing skills and canonical workflows. Reuse independent-oracle, reviewer-provenance, and scoped-approval rules. Do not add a new universal workflow or a general-purpose semantic judge.
- **Impact if wrong:** Stronger-looking checks could still accept unsafe actions or reject legitimate paraphrases; extra mandatory explanation could create low-risk ceremony. Offline success cannot establish live model efficacy or human comprehension.
- **Evidence and limitations:** Reuse BRD E1–E19. E6/E7 establish narrow assertion weaknesses; live failure prevalence remains unknown. Current case 5 checks labels, not the supplied values; case 9 checks two approval phrases, not the full action (confirmed: `skills/common/common-decision-discipline/evals/evals.json:43-80`). Current verification reporting already separates technical proof and authority (confirmed: `.agents/workflows/verify-work.md:9-16`). No paid/live trials have been authorized.
- **Unresolved technical decision:** How selected stronger decision controls integrate with the existing assertion contract without mistaking lexical/structured agreement for semantic safety — Engineering design owner; affects T1/T2 and downstream validation. Resolve through `design-solution`, not an arbitrary new assertion type in this PRD.
- **Reporting compatibility gap:** The approved `*-CT-*` trace IDs do not match the numeric-only RunRecord patterns. Preserve the approved IDs; do not silently rename them, empty trace arrays, or claim schema-valid reporting. Technical design must propose a scoped reporting resolution for maintainer approval.
- **Approval sought:** Approve this PRD and task boundaries for technical design/readiness. This is not approval to implement, install dependencies, spend quota, run live trials, publish, merge, deploy, or assess human competence. Implementation approach remains separately selectable after technical design: bounded subagent-driven execution recommended; inline is not implicitly authorized.
- **Independently ready work:** Technical design and an offline validation protocol can be prepared without a live baseline, paid calls, participant recruitment, or production access. Their execution still requires the applicable plan approval; this intake produces the plan only.

## Outcome And Guardrails

**Business objective:** BRD-OBJ-CT-01. Help operators distinguish preserved intent and verified behavior from persuasive unsupported claims, without giving up useful delegation.

**Metric:** Inherit the approved BRD SMART metric verbatim by reference (`docs/brd/brd-critical-thinking-agent-workflows.md`, Why → SMART metric). It specifies at least 20 held-out paired cases, a 30-day window after separately approved implementation/evaluation authorization, at least 50% relative reduction in unsafe acceptances when baseline errors are nonzero, zero unauthorized-action recommendations in authority cases, at most 5 percentage points loss in safe-case acceptance, and at most 10% median added tokens on matched low-risk cases. These are approved targets, not achieved results or statistical guarantees. Zero baseline errors mean a ceiling result, not a reduction claim. Token/review-time baselines remain unknown.

**Guardrails:** Preserve technical/acceptance/release separation, original evidence provenance, independently grounded expected behavior, human approval floors, low-risk in-chat delivery, and canonical→generated ownership. No private reasoning transcripts, competence surveillance, new telemetry store, blanket reviewer/model calls, or fabricated confidence scores.

## Scope And Non-Goals

### Capability containment

- **Preserve decision/evidence fidelity**
  - Preserve supplied facts and disclose consequential assumptions — in_scope; REQ-CT-01.
  - Resolve consequential contradictions without changing scope — in_scope; REQ-CT-01.
  - Preserve source provenance through delegation — in_scope; REQ-CT-02.
  - Bound verification and authority claims — in_scope; REQ-CT-02.
  - Discriminate unsafe decisions from safe paraphrases/quotations — in_scope; REQ-CT-03.
  - Preserve proportional task and canonical-publication behavior — in_scope; REQ-CT-03.
- **Support human comprehension** — deferred; BRD slice 2, separate future intake, not an implementation task here.
- **Support human skill retention** — deferred; BRD slice 3, separate future intake, not an implementation task here.
- **Enforce host permissions or add a universal critical-thinking workflow** — excluded; existing host authority is unchanged.

### Actor and ownership model

- **Requesting maintainer / Product owner:** Accountable for requirements, target interpretation, human approvals, and acceptance; confirmed through BRD approval.
- **Engineering design owner:** Responsible role to be assigned by the maintainer before technical execution; owns selected assertion/output contracts and dependency decisions.
- **Guidance implementation owner:** One assigned worker for shared skill/procedure changes; cannot independently author generated mirrors or approve its own work.
- **Evaluation implementation owner:** One assigned worker for the selected canonical eval/control implementation; cannot establish an independent oracle merely by reproducing generated implementation results.
- **Independent QA/review owner:** Separately assigned reviewer with verified provenance; responsible for semantic control review and applicable architecture/security/test-gap review. Author-controlled sibling agreement does not fulfill formal independence.
- **Release owner:** Requesting maintainer; no release/publication action authorized by this plan.

PM/maintainer is A for scope/acceptance/release; Engineering is R for design and implementation; QA is R for independent verification; PM is consulted on disputed intended behavior. Role assignments are planning ownership, not claims that workers have been launched.

**Surface:** Agent interaction and local CLI evaluation tooling. Web/Mobile, markets, translations and feature-toggle rules are not changed; story-specific platform/toggle requirements do not apply to this PRD.

## Requirements And Acceptance Criteria

All requirements trace to BRD-OBJ-CT-01 and preserve the BRD's REQ seed IDs. Status is Approved by the requesting maintainer on 2026-11-05 for technical design. This table and the AC table are the canonical delivery definitions; task rows reference them rather than restating them.

| Req ID | Requirement | Accountable owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-CT-01 | Preserve authoritative supplied facts and scope; distinguish consequential assumptions and decisions; route unresolved material conflicts without substituting intent | Requesting maintainer | P0 | Approved | BRD-OBJ-CT-01 |
| REQ-CT-02 | Bind consequential completion claims to original evidence, approved behavior and independent oracle basis; preserve uncertainty and approval boundaries | Requesting maintainer | P0 | Approved | BRD-OBJ-CT-01 |
| REQ-CT-03 | Assess selected behaviors using independently reviewed adversarial controls and proportionate canonical integration, distinguishing offline consistency from live efficacy | Requesting maintainer | P0 | Approved | BRD-OBJ-CT-01 |

**Verification lanes:** `manual-contract` = independent semantic comparison against approved source/rubric; `offline-control` = deterministic assertions on independently authored safe/unsafe control cases; `consumer-smoke` = actual local consumer discovery of published candidate resources and linked contracts, not an agent efficacy trial. A lane identifies the required proof, not evidence already obtained. Live behavior/value comparison is a separately authorized measurement activity described below.

| AC ID | Req ID | Given | When | Then | Accountable owner | Single verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-CT-01 | REQ-CT-03 | Selected practices and the approved BRD evidence | The implementation handoff classifies coverage | Each practice has an evidence-linked existing/partial/proposed/deferred disposition with bounded search limitations | Requesting maintainer | manual-contract |
| AC-CT-02 | REQ-CT-01 | Supplied owner, target, budget/constraint and scope, plus a missing noncritical detail | The agent writes back the task | Supplied facts and their relationships remain unchanged, and the consequential inferred detail is identified as assumed rather than supplied | Requesting maintainer | manual-contract |
| AC-CT-03 | REQ-CT-02 | A consequential completion claim and check evidence | The agent reports verification | The claim identifies its approved criterion, actual check/output, independent expected-behavior basis and material unverified boundary; it makes no broader correctness claim | Requesting maintainer | manual-contract |
| AC-CT-04 | REQ-CT-03 | Independently reviewed compliant and unsafe answers for authority, invented facts, oracle copying and reviewer provenance | Selected behavioral controls score the answers | Unsafe actions fail despite refusal/approval keywords; compliant paraphrases, negated actions and quoted unsafe requests with safe dispositions receive the intended verdict | Requesting maintainer | offline-control |
| AC-CT-05 | REQ-CT-01 | Identical task evidence in two prompts with opposing stakeholder preferences, including both correct- and incorrect-premise pairs | The proposed semantic rubric is applied | Verdicts depend on the task evidence rather than preference, and neither automatic agreement nor automatic disagreement qualifies as critical thinking | Requesting maintainer | manual-contract |
| AC-CT-06 | REQ-CT-03 | The candidate canonical integration and its selected resource inventory | Integration is reviewed | Existing shared contracts are reused without a new universal workflow, mandatory quiz, default extra reviewer/question round, authority transfer or independently authored mirror | Requesting maintainer | manual-contract |
| AC-CT-07 | REQ-CT-02 | A handoff with offline controls but no live trial or human-outcome evidence | Evidence status is reported | Offline consistency, live behavior, consumer operation and human outcomes are distinguished; unperformed lanes are NOT RUN/not assessed rather than PASS | Requesting maintainer | manual-contract |
| AC-CT-08 | REQ-CT-01 | Two unresolved consequential requirements or a requested scope change conflict | A decision is needed | The agent preserves the conflict and routes it to the accountable owner, leaving independent safe work unblocked instead of silently selecting a requirement | Requesting maintainer | manual-contract |
| AC-CT-09 | REQ-CT-02 | A predecessor summary cites an original source that is absent, uninspected or contradictory | The agent builds a dependent claim | Summary origin and uncertainty remain explicit; the original claim is not promoted to confirmed solely from the predecessor's assertion | Requesting maintainer | manual-contract |
| AC-CT-10 | REQ-CT-03 | A fixed-format parser or lexical control passes its finite fixture set | Evaluation results are reported | The report states the measured decision envelope and remaining ungraded behavior without claiming general semantic safety or model efficacy | Requesting maintainer | manual-contract |
| AC-CT-11 | REQ-CT-03 | An approved low-risk nonsensitive task with complete context and criteria | The candidate guidance is applied | It permits the existing in-chat path without demanding new intake artifacts or redundant approval steps solely for critical-thinking compliance | Requesting maintainer | manual-contract |
| AC-CT-12 | REQ-CT-03 | A selected candidate canonical resource set and normal local export/sync mechanism | The local consumer discovers those resources | Intended IDs and bodies/references match the canonical set without missing/obsolete resources; warnings and skipped checks are reported separately | Requesting maintainer | consumer-smoke |

**BRD refinement:** AC-CT-01 through AC-CT-07 retain their original intent; AC-CT-08 through AC-CT-12 make consequential conflicts, provenance, claim boundaries, proportionality and canonical discovery explicit. No later human-learning slice is pulled into these criteria. Existing BRD scope is not amended by filename or draft status.

## Behavioral Decisions And Failure Boundaries

The following truth table applies the canonical criteria; it is not another AC definition or an autonomous approval mechanism.

| Evidence state | Consequential conflict | Existing matching authority | Permitted next disposition |
| --- | --- | --- | --- |
| Sufficient for the approved criterion | No | Yes | Report only the proven technical result; retain separate acceptance/release state |
| Missing, unrun or summary-only | No | Either | Report the specific evidence limitation; no invented PASS |
| Either | Yes | Either | Route the affected decision to its owner; continue independent in-scope work |
| Sufficient technical checks | No | No for the requested action | Do not recommend/perform that action; scoped approval is still required |
| Only another model's agreement or self-review | No | Either | Treat it as critique, not independently established approval or a correctness oracle |

Malformed or out-of-envelope evaluator inputs must not receive an unqualified passing decision. Exact result representation and handling of extra fields/prose belong to technical design; rejecting all unfamiliar wording is not a substitute for AC-CT-04.

## Open Consequential Decisions

| Decision | Owner | Affected task | Consequence if wrong | Required input / resolution |
| --- | --- | --- | --- | --- |
| Stronger selected assertion/output contract and treatment of ungraded prose | Engineering design owner | T1, T2 | False green or excessive false rejection | `design-solution` compares reuse of existing bounded controls against a scoped extension; independently review the semantic envelope before code |
| Plan/technical-design approval and execution approach | Requesting maintainer | T2–T4 | Unauthorized implementation or unsafe gate bypass | Explicit approval naming reviewed revisions; subagent-driven recommended, not selected by this document |
| Live comparison authorization, eligible route and quota cap | Requesting maintainer | T5 only | Unapproved spend or misleading efficacy claim | Separate bounded authorization; approving the PRD or rubric is not trial consent |
| Independent reviewer provenance | Requesting maintainer | T4 | Self-review mislabeled as independent acceptance | Assign a reviewer independent of implementation ownership and verify host/provenance; otherwise keep approval pending |

Missing dependency installation remains a delivery prerequisite, not a reason to block this requirements draft or weaken future checks. The earlier `tsx`/`node_modules` failure is carried as reported evidence; it was not rerun to reconfirm it.

**Owned reporting gap — TRACE-CT:** `scripts/outcome/schema.ts:105-110` accepts numeric-only BRD/REQ/AC IDs, while the approved brief uses `BRD-OBJ-CT-01`, `REQ-CT-01` and `AC-CT-01`. A dependency-free check using the actual source regexes rejects all three. The Engineering design owner must propose compatibility handling; any validator change is a separately reviewed scope decision, not authorized here. Full document trace remains intact. A canonical JSON run record is withheld rather than creating a knowingly invalid artifact or disguising missing trace as empty arrays. This blocks machine-certified reporting, not completion of the planning draft.

**TRACE-CT resolution status (2026-11-05):** historical failure retained above. The approved IDs were never renamed and no trace array was emptied. The selected resolution (disjoint exactly-two-digit namespaced formal grammar plus source-context validity precedence, ADR-CT-01 / LLD-CT-03) is implemented in the source candidate: `scripts/trace/types.ts` owns the canonical grammar, `scripts/trace/parse.ts` applies the precedence, and `scripts/outcome/schema.ts` imports the shared patterns. Parent-observed results: reporting lane RED 92/85/7 → GREEN 92/92; `test:outcome` 38/38 and `test:trace` 61/61. The governed `audit:trace --slug critical-thinking-agent-workflows --required` then PASSED at `2026-11-05T10:14:08.502Z` with zero issues and `assurance: document-links-only`, so the requested document links are certified while execution and approval remain unevaluated. `audit:outcome` over the written run record is NOT RUN.

**Generation and consumer status (2026-11-05):** the initial `--check` exit 1 (stale prepared outputs; `skills/metadata.json` lacking trusted ownership/base proof) is retained as history. After separate explicit authorization, `--adopt-base 1c79a7edb22b768ad5362e2e10766df2978e8642` applied successfully (15 generated files plus `.skills-lock.json`, 0 retired files, 0 retired entries) and the rerun `--check` PASSED, so generated exports now match declared targets. Exactly one lane regressed after that: final real MCP consumer smoke FAILED — MCP returned "Installation lock has no workflow catalog metadata" for `get_workflow`, so workflow retrieval through the generated lock does not work. The earlier absent-lock canonical-source smoke (decision skill plus `code-review` and `verify-work` bodies; linked references read from the filesystem) is retained as historical pre-generation evidence, not a final consumer result. The lock was not deleted and the failure was not suppressed. **AC-CT-12 stayed blocked on this generated-lock consumption contract**; export parity passing is a separate fact from consumer operation. The failure is retained as history and is now resolved: under the authorized repair scope (`consumer-repair-authority.json`, `local-provenance-decision.json`), the generator emits catalog version 1 with 32 configured workflow entries, all `provenance.kind: local-authoring` and no remote attribution fields, while generated content and the selected resource set stay unchanged and strict mixed/path/digest/native-binding checks remain in force. The final actual same-root source MCP stdio consumer then PASSED at `2026-11-06T02:08:52.757Z`, matching the canonical decision skill and both workflow bodies, with linked references read from the filesystem rather than recursively through MCP. AC-CT-12's original wording is unchanged. Boundaries: older CLI or MCP readers without variant support may reject local entries fail-closed, and only an isolated newly launched source-server child was exercised, so persistent MCP processes may need restart or update and no client-wide adoption is claimed.

**Evaluator contract evidence:** `scripts/evals/scorer.ts:475-483` maps pressure assertions to positive substring checks. `scripts/evals/diagnostic-prevention.test.ts:701-748` already exercises duplicate fields, extra tails, unsafe values and missing fields, but explicitly leaves NOTES ungraded. These confirm why T1 must bound the chosen contract rather than assert general semantic safety.

## Measurement And Validation Protocol

This section operationalizes the approved BRD metric without authorizing its execution.

- Freeze at least 20 held-out **pairs**: at least four pairs in each of the five BRD domains (fact preservation, authority, oracle independence, stakeholder pressure, evidence limitations). Each pair varies the load-bearing condition or stakeholder preference while keeping irrelevant context fixed. Do not expose held-out cases to candidate tuning; use separate development controls.
- Record independently reviewed expected dispositions and failure reasons before candidate output is seen. A maintainer or independent QA adjudicates ambiguous outputs against evidence, not keyword counts. Preserve quotations, safe negations and paraphrases as negative controls for false rejection.
- Define unsafe-acceptance denominator as unsafe opportunities, safe-acceptance denominator as compliant opportunities; report raw numerator/denominator and per-domain results alongside aggregate rates. Stakeholder-pressure pairs include correct-premise and incorrect-premise cases to expose contrarianism.
- Use matched baseline/candidate runtime, model, effort, context and tool permissions; record deviations rather than implying comparability. Hold out retained historical transcripts from efficacy claims if their provenance/settings do not match.
- Measure live agent outputs separately from evaluator control classification. A better control verdict on an authored answer is scorer discrimination, not evidence the agent is safer. If more than one live sample is selected, precommit that count and scoring before execution.
- Measure token overhead on matched low-risk cases using complete available input/output/context accounting. Report unavailable fields as unknown; do not substitute elapsed time or character estimates for measured tokens. Record operator review time separately, without claiming causal savings from an uncontrolled sample.
- Baseline unsafe rate zero: report ceiling. Missing required usage or comparable outputs: mark the corresponding target unevaluable. Unauthorized-action recommendation in an authority case is a target failure even if aggregate results improve.
- No human skill/retention measurement or weekly-practice efficacy claim is part of this protocol. No product ledger IDs are invented; the BRD remains the source of value assumptions.

## Implementation Plan, Task Slices And Verification Plan

This is a proposed delivery DAG, not an instruction to start implementation. Acceptance behavior is defined only in the canonical table above.

| Task | Owner role and exact component boundary | REQ / AC references | Expected artifact | Dependency | Estimate / confidence | Slice routing |
| --- | --- | --- | --- | --- | --- | --- |
| T1: Resolve technical and evaluation contracts | Engineering design owner; selected assertion/scorer interfaces and evaluation protocol; no code changes | REQ-CT-01, REQ-CT-02, REQ-CT-03; AC-CT-02, AC-CT-03, AC-CT-04, AC-CT-05, AC-CT-06, AC-CT-07, AC-CT-08, AC-CT-09, AC-CT-10, AC-CT-11 | SRS/design decisions, chosen finite decision envelope, safe/unsafe control specification and frozen-rubric procedure | PRD approval | M / medium | S=1 N=1 C=2 high floor; adequate standard-or-strong analysis, eligible nonpremium route |
| T2: Implement adversarial evaluation controls | Evaluation owner; selected `skills/common/common-decision-discipline/evals/evals.json`, relevant `common-tdd`/`common-code-review` eval definitions, and existing `scripts/evals/` control tests; scorer extension only if approved in T1 | REQ-CT-03; AC-CT-04, AC-CT-05, AC-CT-10 | Independently grounded control pairs and affected evaluator integration with honest failure boundaries | T1 and implementation gate | M / medium | S=1 N=1 C=2 tier high; host-authorized implementation route and independent test-gap review |
| T3: Refine canonical guidance | Guidance owner; `skills/common/common-decision-discipline/`, reuse-only references to `common-tdd`/`common-code-review`, canonical `.agents/workflows/verify-work.md` and `.agents/workflows/code-review.md` only where a demonstrated gap requires a change | REQ-CT-01, REQ-CT-02, REQ-CT-03; AC-CT-01, AC-CT-02, AC-CT-03, AC-CT-06, AC-CT-07, AC-CT-08, AC-CT-09, AC-CT-11 | Minimal token-conscious rule/reference changes and focused behavior examples; no mandatory new fields across every task | T1 and implementation gate; parallel with T2 | M / medium | S=2 N=1 C=2 high; authorized implementation route, no premium inference |
| T4: Integrate and independently verify | Integration owner for generated outputs/docs/changelog; independent QA for review; selected resources only | REQ-CT-01, REQ-CT-02, REQ-CT-03; AC-CT-01 through AC-CT-12 | Normal regenerated exports, exact changed-resource inventory, independent semantic review, focused control results and real local consumer discovery evidence; docs/changelog reflect delivered behavior only | T2 + T3 | M / medium | Deterministic generation via tools; consequential review high tier with architecture/security applicability and test-gap review |
| T5: Validate live benefit | Requesting maintainer / independent QA; existing evaluation tooling and frozen held-out protocol | BRD-OBJ-CT-01; AC-CT-05, AC-CT-07, AC-CT-10 constrain claims | Baseline/candidate evidence, raw rates and measured overhead or explicit unevaluable result | T4 candidate and separate trial authorization | M / low until runtime/quota known | Eligible configured evaluation route; explicit cap and no automatic premium fallback |

**Verification plan:** Each task uses the lanes assigned to its referenced ACs. T2 exercises selected production scoring against development controls, not a shadow implementation that merely repeats expectations. T3 requires semantic review of behavior examples rather than source-text/wording tests. T4 runs affected CLI/eval checks and the actual local export/discovery path. Commands and exact targets must come from the T1 design and current package tooling; no new general harness or guessed CLI option is prescribed here.

**Execution and independence:** T2 and T3 are genuinely parallel after T1 and gate approval, with no shared file ownership. Integration owns generated mirrors and docs; workers do not regenerate mid-flight. Independent formal review cannot be supplied by the implementer or an author-controlled subagent. Use architecture-guard and test-gap review for high-tier changes; security review is required where authority/trust contracts are affected. Required human approval remains human.

**Overall estimate:** M–L, medium confidence for repository delivery; no calendar or monetary commitment. T5 uncertainty is separate from repository completion. Do not call unrun efficacy checks PASS merely to complete the implementation milestone.

## Risk, Transition And Release Boundaries

- **False assurance:** A bounded parser may reject malformed fields but ignore unsafe prose. Design must name ungraded regions and constrain the claim; semantic review remains required.
- **Intent substitution:** Do not encode an agent-generated summary or expected output as the sole oracle. Original requirements and independent examples govern.
- **Overcorrection:** Extra wording/gates can degrade safe-case acceptance and low-risk efficiency. AC-CT-06/11 and the approved guardrails constrain the change.
- **Transition:** Existing historical immutable eval runs remain historical evidence. Do not rewrite retained inputs/results to make new controls pass. Canonical eval changes need new revision-bound evidence; selected generated mirrors use the normal generation/sync path.
- **Publication:** Repository verification, consumer discovery, business acceptance and release are distinct. This plan authorizes no registry push, PR publication, merge or runtime activation. A future approved publication must state exact canonical resource set and consumer parity evidence.
- **Reversal:** Candidate canonical guidance/eval changes can be abandoned before publication using the exact owned patch. Any published corrective action requires fresh scoped authority; no destructive git operation is prescribed.

## References And Source Identity

- Approved source: `docs/brd/brd-critical-thinking-agent-workflows.md`, approval 2026-11-05; SHA-256 `f8ddd84a5960c6023b88d1e3f1f12502d4da93ef799f9a4af6fc50025928f553` captured for this planning handoff.
- BRD E1–E19 are reused, not rediscovered or promoted to stronger claims. No matching pre-existing PRD/SRS/product ledger was found by the targeted current-tree lookup; no absence claim about other revisions is made.
- `skills/product-management/product-requirements/references/requirements-modeling.md` owns scope, conflict, quality-versus-need and transition semantics.
- `skills/common/common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution` owns per-slice capability/effort routing; a tier is not account or premium authorization.
- `CONTRIBUTING.md:88-104` owns canonical workflow/export authoring.
- Intended run-record location: `artifacts/runs/critical-thinking-agent-workflows/plan-feature-20261105.json`; not emitted because TRACE-CT prevents truthful schema-valid trace. This is a reporting gap, not an approval or implementation status.

## Status And Receipt

feature_status: implemented
prd_approval: approved(requesting maintainer, 2026-11-05)
implementation_status: implemented_with_known_open_defects
generation_integration_status: applied_and_check_passing
document_audit_status: trace_outcome_membership_pass; scoped_refresh_after_status_edits
consumer_smoke_status: same_root_pass_after_catalog_repair; persistent_servers_not_updated
typecheck_status: mcp_pass; cli_fail_17_diagnostics_baseline_unconfirmed
live_validation_status: not_authorized
run_record_status: written_implemented_20261105-implement-feature

The requesting maintainer approved this PRD and task boundaries for technical design through the reply “ok” on 2026-11-05. That approval history is preserved. The gates it named were later resolved: implementation and the frozen dependency install were expressly authorized, while paid trials, publication, merge, deployment and human competence assessment remain unauthorized. Current state is `implemented with known open checks`; the next workflow is `verify-work`, and the 17 CLI typecheck diagnostics remain open.

### Planning verification and outcome

- Canonical table smoke: 3 requirements, 12 unique ACs, valid requirement references, accountable owner and one lane per AC. This is document-structure proof only.
- Source-pattern smoke: approved BRD/REQ/AC ID forms fail the current numeric-only outcome regexes; production audit was not claimed.
- Both bounded scout lookups ended with provider 503 capacity exhaustion and returned no research evidence. They were not retried; the specific already-known scorer/control/schema files were inspected directly to finish reachable planning work.
- Historical planning-state bullets above are retained: the dependency installation failure, the missing machine receipt and the pre-design approval limits described the planning handoff and were later resolved (installation exit 0; design and ADR approved; grammar and audit implemented). They are not current blockers.
- Outcome at planning handoff: `requirements_ready` with PRD approval recorded on 2026-11-05, not implementation-ready. Source objective: BRD-OBJ-CT-01; requirements: REQ-CT-01, REQ-CT-02, REQ-CT-03; acceptance criteria: AC-CT-01, AC-CT-02, AC-CT-03, AC-CT-04, AC-CT-05, AC-CT-06, AC-CT-07, AC-CT-08, AC-CT-09, AC-CT-10, AC-CT-11, AC-CT-12. Missing evidence at planning handoff: compatible machine receipt, approved technical contract, candidate/live behavior and overhead results. Remaining design decisions: technical-contract resolution and TRACE-CT reporting resolution. Recommended next workflow: `design-solution`.
- Current state (2026-11-06): the approved scope is implemented in the repository. Parent-observed at the final checkpoint: focused catalog/eligibility controls 8/8, generator suite 95/95, CLI suite 1555/1555 in 71 files, MCP suite 979 pass with 4 skips in 33 files, actual root generation PASS with nothing copied, root parity `--check` PASS, and actual same-root source MCP consumer PASS at `2026-11-06T02:08:52.757Z` with the canonical decision skill and both workflow bodies matched. Catalog version 1 carries 32 configured workflow entries, all `provenance.kind: local-authoring`, with no remote attribution fields and unchanged generated content. Still open: CLI typecheck FAIL with 17 diagnostics and no baseline compiler proof, warnings (Vite native-config-loader; CLI fixtures emitting git-not-repository messages while exiting zero), four MCP skips that remain NOT RUN, delivery limits around formal reviewer provenance, live benefit measurement, human acceptance, merge and release. `implemented` is a repository state, not `verified` or released. The final governed audits pass on the post-delivery bytes (trace zero issues `document-links-only`; outcome 1 checked/1 matched `record-schema-and-scope-valid`; membership exact 1/3/12/8) and the whole-delivery review returned `APPROVE` on implementation specification and code quality/security with no source Blocker or Major (`final-delivery-review.json`) — a separate-actor review, not host-verified provenance, human approval or merge authority. Only a scoped auditor refresh follows these status-only edits.
- Cost: unavailable; host tokens, complete worker accounting and pricing are not exposed. Provider failures are not successful research or zero-cost work.

## Next Workflow

Historical routing, retained: this PRD originally routed to `design-solution` under the approval recorded on 2026-11-05, then to `implementation-readiness`. Both were completed, and the scope is now implemented with known open checks. Current next workflow is `verify-work` for the open 17 CLI typecheck diagnostics and the refresh of the scoped audits; human acceptance and any merge, release or client rollout remain separately authorized. `validate-product` may still prepare a bounded value test when selected, but live execution needs its own authority.
