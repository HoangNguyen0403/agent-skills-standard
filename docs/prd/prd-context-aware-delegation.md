# PRD: Context-aware delegation and economical capability selection

Date: 2026-10-26
Slug: `context-aware-delegation`
Profile: technical; lane: direction
Status: requirements approved; repository implementation integrated as guidance (source acceptance and integration evidence recorded under `artifacts/context-aware-delegation/`). Final acceptance outcome is tracked in the final-evidence status record; activation not requested.
Execution approach: Subagent-Driven, selected by the requesting maintainer
Product/approval owner: requesting repository maintainer
Engineering/integration owner: execution orchestrator
Validation owner: independent acceptance reviewer
SNC: S=2 N=1 C=2 total=5 tier=high (planning inference: cross-surface guidance affects authority interpretation). This does not authorize premium usage.

## 1. Objective and source of intent

OBJ-01: Reduce unnecessary context handoffs without weakening acceptance or authority boundaries.
OBJ-02: Help consuming hosts select economical, eligible model/effort configurations without assuming pricing, quota, account eligibility or unsupported capabilities.
OBJ-03: Reduce irrelevant skill loading and evaluate whole-task outcomes honestly.

Source: maintainer's request to assess Anthropic's subagent article, followed by a request for an improvement plan delegable to subagents. The prior in-chat assessment is the equivalent direction brief; no separate business intake is required.
Article: https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop

SMART metric: before any default activation, complete the ten-scenario comparison protocol in the implementation plan, with repeated paired runs, zero observed critical authority/acceptance regressions and per-case outcome reporting. Monetary improvement remains an unvalidated hypothesis until complete matched-cohort metering exists. No invented percentage saving or deadline.

## 2. Scope inventory

| Capability | Classification | Requirement |
| --- | --- | --- |
| Select useful context boundaries | in_scope | REQ-01 |
| Preserve authority and independent review | in_scope | REQ-02 |
| Request model capability and reasoning effort | in_scope, guidance only | REQ-03 |
| Record actual resolution and economics limitations | in_scope, guidance using existing contracts | REQ-04 |
| Avoid unrelated database skill loading for LLM routing | in_scope, canonical metadata correction | REQ-05 |
| Compare end-to-end outcomes and publish consistent exports | in_scope | REQ-06 |
| Implement a general model resolver or provider price service | excluded | Not needed for this guidance release |
| Change personal profiles, host approval controls or billing | excluded | Requires separate host-owner authority |
| Remove required review, premium approval or data isolation | excluded | Safety invariant |
| Execute paid/native-model benchmarks | excluded from this implementation authorization | Separately approved experiment only |
| Rewrite keyword matching globally | excluded | Existing boundary matcher is not the defect |

## 3. Personas and stories

- US-01: As a coding orchestrator, I want to keep tightly coupled work together so that handoffs do not discard necessary reasoning. REQ-01/02.
- US-02: As a host integrator, I want capability and effort guidance separate from account authority so that economical routing respects the operator's configuration. REQ-03/04.
- US-03: As a skill consumer, I want LLM-routing requests to load relevant standards rather than database models. REQ-05.
- US-04: As a repository maintainer, I want repeatable, complete comparisons so that simpler orchestration is adopted on evidence rather than marketing. REQ-06.

These stories are independently verifiable but share the authority invariant below. All acceptance criteria target repository guidance/MCP consumers, not web/mobile interfaces or market toggles.

## 4. Requirement registry and atomic acceptance criteria

All requirements are proposed, priority P1 except REQ-02 (P0). Product accountability remains with the maintainer; implementation ownership is assigned in the plan.

| Requirement | Objective | Observable acceptance |
| --- | --- | --- |
| REQ-01: Choose delegation by benefit and context independence, not checklist/file count | OBJ-01 | AC-01: Given tightly coupled sequential work and a host permitting main-loop execution, the guidance selects one implementation context. AC-02: Given independent, verifiable work with disjoint ownership, it permits concurrent bounded workers. AC-03: Given only a specialist label or another workflow stage, it does not require a new agent. |
| REQ-02: Preserve controlling authority and review obligations | OBJ-01 | AC-04: Given a host requiring delegation, the guidance follows that requirement even when one context would otherwise be preferable. AC-05: Given missing required approval or unavailable isolation, it stops the affected operation rather than inferring permission. AC-06: Given a required independent acceptance gate, implementer self-review cannot satisfy it. |
| REQ-03: Give provider-neutral capability/effort guidance | OBJ-02 | AC-07: Given a deterministic operation, guidance considers a tool/script before another LLM. AC-08: Given a configured eligible profile, the host preserves its explicit model/effort settings rather than silently replacing them. AC-09: Given unsupported effort selection, the result records unsupported status rather than claiming the effort was applied. AC-10: Given a strong capability hint, no premium call is authorized by that hint alone. |
| REQ-04: Describe resolution and economic uncertainty honestly | OBJ-02 | AC-11: Given a dispatch, its documented receipt records requested tier, actual configuration, selection reason and capability limitations. AC-12: Given unknown price/quota or incomplete actor accounting, no numerical monetary savings are claimed. AC-13: Given exhaustion, fallback stays within already-authorized eligible routes. AC-14: Given defective output rather than exhaustion, guidance uses the existing corrective-assignment policy instead of treating it as provider failure. |
| REQ-05: Narrow ambiguous model triggers | OBJ-03 | AC-15: Given `model routing`, `thinking level` or `LLM model selection`, keyword routing does not load MongoDB or Eloquent merely because of `model`. AC-16: Given explicit MongoDB/Mongoose model intent, MongoDB guidance remains discoverable. AC-17: Given explicit Laravel/Eloquent model intent, Eloquent guidance remains discoverable. AC-18: Given a relevant model-tier request, the capability-routing standard remains discoverable. |
| REQ-06: Evaluate and publish consistent guidance | OBJ-01/02/03 | AC-19: Given the final source revision, generated exports reflect the same decision boundaries. AC-20: Given offline fixture/scorer evidence, the report does not describe it as live model efficacy or measured savings. AC-21: Given a proposed comparison, it includes all ten scenarios, repeated matched runs and per-case regressions. AC-22: Given missing experiment authorization, no paid execution occurs. |

## 5. Canonical decision boundaries

Order: controlling host authority -> required independence/isolation -> context coupling and verifiability -> economical eligible capability choice. Cost never overrides eligibility, permission or required review.

| Condition | Result |
| --- | --- |
| Deterministic work | Tool/script first, preserving normal tool permissions |
| Coupled sequential reasoning; host permits main-loop implementation | One implementation context with progressively loaded skills |
| Independent, bounded, verifiable slices | Bounded parallel workers, one owner per component |
| Measurable context pressure | Consider isolated research/worker contexts; retain evidence links |
| Required independent verification | Separate reviewer regardless of implementation placement |
| Permission isolation needed but unavailable | Report unsupported/blocked operation, not a prompt-only sandbox |
| Host requires worker execution | Preserve that boundary; keep coupled steps in one bounded worker |

Model capability and effort are independent dimensions. `fast | standard | strong` remains a capability hint. Low/medium/high effort is advisory only when the host exposes those semantics. Neither a small diff nor cheap price establishes low risk.

The initial release supplies guidance for operator preferences (economy, balanced, quality-first) without introducing a new persisted preference schema. Explicit host settings win. Workers cannot alter account/profile eligibility or self-escalate spend.

## 6. Evidence and assumptions

- confirmed(`skills/common/common-subagent-driven-development/SKILL.md`, `references/methodology.md`): current guidance is delegation-first and requires independent reviews.
- confirmed(`skills/common/common-task-complexity-routing/SKILL.md`): host-neutral capability hints and premium boundaries already exist.
- confirmed(`ARCHITECTURE.md:142-147`): assignment/lifecycle and cohort-economics contracts already exist; reuse rather than duplicate them.
- confirmed(`mcp/src/services/SkillIndex.ts:198-278`): complete-trigger boundary matching already exists. Bare `model` still matches the phrase `model routing`.
- confirmed(`skills/database/database-mongodb/SKILL.md`, `skills/laravel/laravel-eloquent/SKILL.md`): both declare ambiguous bare `model` triggers.
- confirmed(`mcp/test/SkillIndex.spec.ts`): canonical-repository regression tests already cover keyword ambiguity.
- confirmed(`docs/plans/book-to-skill-large-source-delegation.md`): bounded-context decomposition has prior task-specific precedent; this proposal generalizes guidance without replacing that plan.
- assumed: removing unnecessary handoffs will improve at least some task cohorts. Only controlled runs can establish that benefit.
- unknown: consumer subscriptions, private quotas, prices and actual host enforcement. No repository text proves any of them.

## 7. RACI, risks and rollout

| Role | Accountability |
| --- | --- |
| Maintainer (PM/business approver) | Accountable for scope, policy approval and any experiment budget |
| Orchestrator (BA/architecture/integration) | Responsible for assignments, eligibility, source identities, integration and acceptance evidence |
| Task workers | Responsible only for owned paths and requested outcomes |
| Independent reviewer (QA) | Responsible for AC verification; cannot grant human authority |
| Integration owner (release) | Responsible for generated output provenance and evidence preservation; no deployment authority |
| Frontend/mobile/backend feature roles | Not applicable; this is guidance, metadata and evaluation maintenance |

Main risks: guidance conflicts with controlling host rules; unsupported effort misrepresented as applied; cheap attempts accumulate repair cost; keyword precision damages legitimate discovery; generated outputs overwrite unrelated SDD evidence. Mitigations are the decision precedence, negative cases, full-cohort reporting, positive controls and one generator owner.

Repository publication and runtime activation are separate. First prepare/review repository changes and offline evidence. Maintainer then decides whether to authorize live comparisons and later host adoption. Neither merge nor deployment is authorized by this plan. Revert affected source changes and regenerate only their outputs if a later authorized comparison detects regressions; preserve old evidence.

## 8. Handoff and approval

Implementation plan: `docs/prd/prd-plan-context-aware-delegation.md`.
No unresolved product choice prevents preparation of bounded assignments. Actual dispatch still requires current project/account eligibility, approved scope, revision-bound manifests and valid dependency receipts. Missing prerequisites block only the affected dispatch.

Planning deliverable status: requirements_ready for maintainer review.
Implementation status: repository implementation integrated (source changes accepted by independent review; generated exports regenerated with digest parity; offline evidence only), plus correction run2 after an independent MAJOR finding that host category indices had dropped both new common rows — corrected with the complete mirror inventory, and all four host indices now carry every installed common ID. Final acceptance outcome and any activation decision: `artifacts/context-aware-delegation/final-evidence/correction-run2/STATUS.json`.
Next workflow: independent final acceptance of the integrated revision; host adoption and live comparisons remain separately authorized.
Cost status: unavailable; no measured savings.
Change log:
- 2026-10-26 — initial proposed requirements and trace from the maintainer's request.
- 2026-10-27 — implementation integrated; source acceptance receipts and integration evidence recorded; status values updated without claiming final acceptance or activation.
- 2026-10-27 — correction run2: regenerated host category indices from complete mirror inventory after the first pass omitted two common rows; run1 evidence retained as history.
