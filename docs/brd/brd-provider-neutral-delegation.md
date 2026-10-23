# Direction Brief: Provider-Neutral Delegation

slug: provider-neutral-delegation
operator_profile: technical
lane: direction
snc_tier: high
approval: approved(requesting_operator, 2026-10-23)
repository_status: proposal_recorded
activation_status: not_required

SNC: S=2 N=1 C=2 total=5 tier=high. Proposed changes span shared workflow, loading and host trust/cost boundaries; implementation requires an approved plan.

## You Said / Assumptions

- You said: deeply review skill/workflow-triggered subagents, improve work quality and cost, and support providers beyond Claude with different invocation mechanisms.
- Assumed: this turn requests review and a proposed direction, not implementation, policy changes, paid benchmark runs or deployment.
- Assumed owners: repository maintainer as sponsor/decision-maker; implementation owner and independent reviewer assigned during planning.
- Unknown: current end-to-end delegation cost and native runtime parity across supported provider surfaces. Neither is established by answer-eval scores or file exports.

## Contract

**Outcome:** bounded delegation improves accepted-task economics without losing requirements, safety, review independence or provider portability.

**Constraints:** retain registry -> CLI -> host architecture; canonical instructions remain provider-neutral; host policy and account eligibility win; no automatic premium escalation; no inference that context isolation is filesystem isolation; preserve required approvals and durable evidence.

**Scope:** task admission/granularity, context delivery, standalone brief contract, lifecycle semantics, host capability binding, specialist export correctness, existing telemetry/evals, and measured rollout. Each item addresses a finding in the linked review.

**Non-goals:** a new agent framework; model-vendor lock-in; encoding personal profile names in shared workflows; rewriting all skills; unapproved model calls or account fallback; deleting safety controls to save tokens; optimizing parent tokens while ignoring worker cost.

## Capability Inventory

- Select delegation only where allowed and useful.
- Deliver complete minimal context to the actual worker.
- Bind semantic operations to verified host capabilities.
- Preserve authority, ownership and independent acceptance.
- Classify failures and bound authorized recovery.
- Measure full-task outcomes and cost coverage.

## Acceptance Criteria / Trace Seed

- **AC-1 / REQ-1:** parent and fresh sibling/child lookups cannot suppress a required skill body merely because another context loaded it; prove content-revision delivery, with safe behavior when context identity is unavailable.
- **AC-2 / REQ-2:** the generated task packet retains applicable plan-level authority, invariants, dependencies, owned paths, ACs and verification while excluding unrelated tasks; fail preparation when required fields are missing.
- **AC-3 / REQ-3:** canonical delegation rules describe operations semantically; profile/model/effort/tool bindings remain host-owned, explicitly eligible, and capability-checked. Missing controls produce an explicit gap rather than false parity.
- **AC-4 / REQ-4:** exhausted provider, bad output, missing prerequisite and consequential unresolved decision take distinct authorized routes; premium cannot be reached by automatic retry count.
- **AC-5 / REQ-5:** demonstrate native discovery and bounded invocation on each claimed supported host surface/version, including artifact access and necessary tool/permission restrictions; unsupported surfaces are disclosed and not certified by serialization tests.
- **AC-6 / REQ-6:** coherent-task freshness/resume and dependency-ready concurrency preserve ownership, settled verification and mandatory independent reviews. Approved inline exceptions and evidence retention are unambiguous.
- **AC-7 / REQ-7:** matched current/proposed/baseline executable trials report accepted-task rate, retries, wall time and full-actor cost/usage; incomplete usage prevents savings claims. Preserve failed and cancelled attempts.
- **AC-8 / REQ-8:** required workflow discovery and native invocation resolve the same installed canonical catalog, independent of provider export layout.
- **AC-9 / REQ-9:** changes update canonical sources/transformers and regenerate mirrors through existing tooling; evidence and rollout records identify source revision and rollback target.
- **AC-10 / REQ-10:** worker bootstrap consumes the assigned contract and necessary standards without repeating parent intake/global workflow discovery; held-out routing cases distinguish relevant worker standards from unrelated keyword/composite matches.

## Value and Measurement Contract

Objective: lower full-task cost per accepted result at preserved required behavior and authority boundaries.

SMART metric: before promotion beyond an owner-approved canary, establish matched task-class baselines and publish repeated held-out comparisons for accepted-task rate, total actor usage/cost and latency. Numerical improvement thresholds are set after baseline, not invented now. Deterministic authority and contract scenarios must all pass; any observed loss of required behavior or review independence blocks promotion pending resolution. Validation owner: repository maintainer with independent reviewer.

Subagent execution may improve latency or main-context clarity while increasing total cost. Report these as separate outcomes. No cost-saving guarantee accompanies this brief.

## Options and Recommendation

1. **Prompt-only cleanup:** cheapest to abandon, but cannot fix shared-context delivery, native export mismatches or missing runtime evidence. Useful first patch, inadequate final solution.
2. **Extend existing contracts and host bindings — recommended:** repair confirmed gaps, reuse current exporters, journal and eval seams, then measure routing by task class. Main risk: host feature/version drift; mitigate version-pinned smoke receipts and explicit unsupported capability status.
3. **Build a new orchestration service:** greater operational burden and duplicated lifecycle/policy logic; rejected absent evidence that existing host integrations cannot satisfy the contract.

Do-nothing retains confirmed context-transfer and policy contradictions; not recommended. Defer unapproved provider benchmark spending while completing repository-local preparation.

## Evidence and Risks

Confirmed evidence and exact source anchors: [Subagent Optimization Review](../../artifacts/subagent-optimization-review.md), findings F1–F10 and verification section.

- Confirmed: current source contracts and observed MCP/brief-extraction scenarios.
- Assumed: coherent-task batching and explicit model mapping can improve task economics; validate, do not promise.
- Unknown: actual savings, task-class optimal worker size and native parity on unexercised surfaces.
- Risk owners: maintainer owns policy/eligibility; host integration owner owns enforcement/discovery evidence; evaluation owner owns measurement validity. Assign named implementers before execution.
- Review window: maintainer review before implementation planning; no external rollout or acceptance date is committed.

## Approval and Handoff

Approval: approved(requesting_operator, 2026-10-23), recorded from the operator's “ok” in this conversation. Approval accepts this direction only, not implementation approach, premium consultation, benchmark spend, merge or deployment.

Recommended next workflow: `plan-feature`, followed by technical design/readiness where needed. Plan bounded slices with one implementation owner per component; select the execution approach under host policy before implementation. Preserve independent review of cross-context delivery and authority changes.

Outcome: requirements_ready for direction review; implementation not started. Completed evidence: canonical source review, live MCP observation, standalone brief smoke, source applicability assessment. Missing evidence: host-native conformance and full-task baseline/trials, intentionally assigned to the proposed work. Cost source: unavailable; no model usage or pricing figures were supplied by the host.
