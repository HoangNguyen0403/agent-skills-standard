# Feature Plan: Demonstrable AI Work Slices

slug: ai-workflow-effectiveness
operator_profile: hybrid
lane: direction
snc_tier: medium
model_tier: standard
delivery_mode: standard
approval: approved(requesting operator, 2026-11-06)
Owner: repository maintainer. Validation owner: independent reviewer, with requesting operator retaining human acceptance. Updated: 2026-11-06.

SNC: S=2 N=1 C=1 total=4 tier=medium, carried from the approved brief. Guidance/verification only; no runtime permission, application schema, API or sensitive-data change.

## Decision Brief

- **Changes since approved revision:** Initial PRD, preserving BRD-OBJ-001, REQ-001…003 and AC-001…005. Incorporates the operator-confirmed non-duplication boundary for PRs #296–#298. No additional capability or altered success metric.
- **Recommendation:** One coherent implementation slice: compact planning rule plus a demand-loaded worked example, with existing assignment-packet compatibility and a real consumer smoke. A separate reviewer owns acceptance checking. Do not split rule, example and packet compatibility across implementation workers: they share one contract and are not independently useful deliveries.
- **Impact if wrong:** A dogmatic vertical rule creates excessive tickets or fake demos; copying pending PR functionality creates ownership conflicts. Explicit exceptions and fixed non-goals constrain both risks.
- **Evidence and limitations:** confirmed([approved brief](../brd/brd-ai-workflow-effectiveness.md)); approved source SHA-256 before canonical-AC relocation: `66878a3102ca0f7a920b1376583f292891d1e8fbdcb412f4717e099018078e22`. confirmed([existing planning contract](../../.agents/workflows/plan-feature.md):18-35), SHA-256 `a2cd0148149e66ebe2a572ea4ffcd5fd42a4a78cc2a2eb2f40c0c05c1b418b0e`. The brief retains exact inspected PR heads and evidence links. No observation establishes better generated plans, lower cost or faster delivery.
- **Approval recorded:** The requesting operator approved this requirements/decomposition/verification plan on 2026-11-06 via “ok” in response to its presentation. This does not approve implementation placement, model spend, host publication, merge or release.
- **Independently ready work:** The single source slice can enter implementation-readiness. Existing packet functionality and baseline inspection do not depend on merging #296–#298. If an optional pending verification contract is not installed, do not copy it or pretend it is available.

## Outcome And Guardrails

**Objective:** BRD-OBJ-001 from the approved brief. Maintainer planners can distinguish a feature slice that demonstrates behavior from an unfinished horizontal layer, while workers consume the existing bounded packet without another intake or task schema.

**SMART metric:** Within 14 calendar days of implementation approval, the maintainer reviews three representative plans: a cross-layer feature, a shared prerequisite and a mechanical refactor. Every feature slice has a demonstrable outcome; every exception has an owned verification result and dependency explanation; all five canonical ACs below have linked evidence. Capture the same examples before source edits. This is bounded acceptance, not a productivity experiment or delivery-date commitment.

**Guardrails:** Existing risk floors, clean-cutover default, requirement identities, owner boundaries, standards loading, review independence and human acceptance/release authority remain unchanged. Keep detailed teaching material demand-loaded. No claim that schema validation authenticates approval or that a manual plan comparison measures live-model efficacy.

## Scope And Non-Goals

### In Scope

- Define demonstrable feature slices — REQ-001 / AC-001.
- Classify verified exceptions — REQ-001 / AC-002.
- Preserve existing packet consumption — REQ-002 / AC-003.
- Demonstrate the planning-to-consumer contract and qualify proof — REQ-003 / AC-004, AC-005.

### Out Of Scope

Verification kits, proof schemas, freshness machinery and readiness gates (#296); generic evidence-fidelity policy and evaluators (#297); diagram renderers, architecture-reader studies and N+1 cases (#298). Also excluded: new task schema/fields, tracker/dashboard, agent fleets, runtime policy, trace-ID/parser repairs, paid/live model experiments, application features, dependency installation, host activation, publication or deployment.

A missing historical evidence artifact is not permission to create an evidence platform. Existing testing-reference-improvements remains independently owned. Broader productivity/comprehension measurements are excluded from this delivery, not silently added as prerequisites.

## Requirements And Acceptance Criteria

These tables are the canonical active definitions. The BRD retains approved outcome, source history, rationale and links; it must not maintain a competing editable AC set. Existing IDs and approved meanings are preserved.

ENG = repository maintainer as implementation owner; QA = independent reviewer; PO = requesting operator. ENG owns each requirement; PO owns scope/priority and human acceptance. Requirement statuses below record bounded source-only technical delivery, not publication or human acceptance.

| Req ID | Requirement | Owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Planning distinguishes independently demonstrable feature increments from explicitly justified, verifiable prerequisite/research/mechanical-refactor exceptions. | ENG | P1 | Source implemented / technically verified | BRD-OBJ-001 |
| REQ-002 | Slice assignments remain consumable through existing bounded packet contracts without new fields, schema or repeated discovery. | ENG | P0 | Source implemented / technically verified | BRD-OBJ-001 |
| REQ-003 | Planning-specific behavioral and consumer evidence identifies both the demonstrated result and unverified boundaries without duplicating adjacent machinery. | ENG | P0 | Source implemented / technically verified | BRD-OBJ-001 |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | A feature requiring multiple layers and a proposed layer-only task breakdown | A maintainer applies the revised planning rule/example | The plan is rejected or regrouped into thin behavior increments, each naming an independently demonstrable outcome, required real producer-to-consumer path and canonical requirement/AC references; a positive vertical plan is retained. | QA | Manual semantic comparison against independently reviewed scenario expectations |
| AC-002 | REQ-001 | Shared prerequisite, research and mechanical cross-cutting refactor examples | The maintainer classifies non-feature work | Each justified exception has a type, concrete verification result, consumers and dependency edges; no fake UI demo or compatibility shim is demanded when the approved contract requires clean cutover. | QA | Manual exception-case review |
| AC-003 | REQ-002 | A current-format bounded slice plan and explicit assignment manifest at a known source revision | The existing task_brief.py publishes a packet and a reviewer reads it without prior conversation | Owned paths, inputs, dependencies, source identity, verification, integration owner and correction route are recoverable using existing fields, with no new schema/fields or second intake. | QA | Existing packet-consumer compatibility smoke plus fresh-context review |
| AC-004 | REQ-003 | One plausible bad plan and a representative real producer-to-consumer example derived from the revised guidance | The covering verification is executed | The bad plan is rejected for its behavioral defect, and the selected good slice's real entrypoint produces the independently specified observable result; offline/manual discrimination, packet validation and any live-agent behavior are reported separately. Keyword/source assertions alone do not satisfy this criterion. | QA | Planning-to-consumer smoke with independent expected-result basis |
| AC-005 | REQ-003 | Completed checks, unperformed lanes and applicable source/revision identities | The verification report is produced | Each claim links its criterion and actual evidence and states material limits; missing live, human or cost evidence is unassessed, never claimed as throughput, savings, comprehension or release improvement. | QA | Independent evidence review using existing fidelity rules |

## Delivery Plan And Ownership

One coupled implementation slice is intentional, not an absence of decomposition. No parallel implementers are warranted for one shared planning contract. Independent review remains a different actor.

| Work item | Owner and owned component | Trace | Expected artifact / observable result | Dependencies | Estimate / confidence |
| --- | --- | --- | --- | --- | --- |
| S1 — Deliver demonstrable slice planning | One bounded implementation owner: `.agents/workflows/plan-feature.md`; new demand-loaded `skills/product-management/product-requirements/references/feature-slicing.md`; only a minimal link in that skill if required for discovery; same-slug docs/changelog | REQ-001…003 / AC-001…005 | Planner-facing rule/example plus source-bound baseline/comparison and an existing-format packet that supports the demonstrated consumer behavior | Plan approval; execution approach; required standards loaded; current PR-head overlap check; independent expected-result review before verification | M / medium; capability standard, effort resolved from eligible host profile |
| V1 — Independently verify S1 | Separate reviewer owns acceptance assessment, not implementation or human approval | All existing ACs | Criterion-linked report over cumulative owned changes and real smoke evidence; rejects horizontal/padded plans and exaggerated claims | S1 evidence and frozen source identities | S / medium; eligible analysis/review route |

These are one delivery slice and its required independent verification, not two independently runnable implementation slices. Do not spawn one worker per workflow stage or split shared source ownership. Host execution-gate policy controls whether S1 runs in a bounded worker or an explicitly authorized inline exception. No route/model has been selected or launched for implementation.

### S1 Task Contract For Readiness

- **Scope / owned write set:** Only S1 paths above plus necessary existing canonical registry metadata and derived exports if separately authorized for publication. No packet-helper code changes. If discovery requires another canonical owner, return the exact decision before editing it.
- **Inputs:** This PRD; approved BRD and exact source identity; existing plan-feature; current packet schema/helper and assigned standards; recorded PR overlap snapshot, refreshed before implementation.
- **Outputs:** Minimal canonical guidance/reference, baseline/positive/negative comparison, current-format packet, real consumer evidence and cumulative source/revision receipt.
- **Real ingress:** Maintainer applies plan-feature to the selected scenario; task_brief.py consumes the resulting plan and manifest; the selected example's actual command/API consumes the corresponding good slice.
- **Positive invariant:** A feature slice demonstrates its owned behavior without waiting for an unrelated layer ticket.
- **Negative invariant:** No horizontal layer is mislabeled complete behavior; no generic exception hides an undefined result; no new task schema, duplicate verification/fidelity system or unauthorized source owner.
- **Verification owner:** Independent QA reviewer, distinct from implementer; requesting operator supplies any required human acceptance.
- **Handoff / freeze:** Freeze cumulative owned sources, scenario expectations and raw evidence at identified revisions; hand off the complete report, not a fix-only fragment.
- **Correction route:** Existing one-correction/authorized-fallback host policy. Missing context or unresolved ownership returns to maintainer; it is not provider exhaustion or permission to edit another component.

### Verification And Examples

Before editing source, record how current guidance handles the three approved plan classes. An independently reviewed expected-outcome basis must precede the candidate comparison; do not derive the oracle from the new guidance. The bad-plan case fails because it cannot demonstrate the owned feature outcome, not because it lacks a chosen phrase.

Use the existing Python packet entrypoint: `rtk proxy python3 skills/common/common-subagent-driven-development/scripts/task_brief.py PLAN_FILE TASK_NUMBER --assignment ASSIGNMENT_JSON --out BRIEF_FILE`, substituting actual approved scenario artifacts. Its exit code and packet contents are compatibility proof, not approval authentication or evidence of worker execution. Existing negative helper tests are reused; add no source-wording or forwarding tests.

The real consumer example must name its actual entrypoint and expected outward result during readiness. Prefer a small existing runnable repository journey when it naturally demonstrates the selected behavior. If no existing journey is suitable, define a bounded throwaway executable example with an independent oracle; no production application change or fake mocked success. Do not represent a manually authored good plan as a model-generated improvement. Missing environment or authority blocks only that smoke, not safe planning work.

For source changes, use existing registry validation and supported isolated generation checks at integration. Select commands from current package scripts and generation documentation; do not introduce a new checker. Native exports remain derived and are changed only under matching publication authority. If activation is outside scope, report source-only delivery and leave exports intentionally unchanged.

## Open Consequential Decisions

| Decision | Owner | Affected work | Consequence if wrong | Required resolution |
| --- | --- | --- | --- | --- |
| D-PLAN — resolved | Requesting operator | S1 readiness | Plan mistaken for approval | Approved on 2026-11-06 via “ok”; prior brief/overlap approval remains intact |
| D-EXEC — resolved | Requesting operator / orchestrator | S1 execution | Unauthorized implementation placement | Operator selected A / Subagent-Driven; one bounded implementer plus separate reviewer executed under recorded profiles |
| D-SMOKE — resolved | Maintainer with independent QA | AC-004 execution only | Packet/schema success substituted for feature behavior | Existing scoped outcome CLI positive/absent-identity journey exercised; independent oracle and cumulative source review retained |

No new architecture/API/storage contract is introduced, so a separate SRS is not required by the current plan. If scope changes that conclusion, route only the affected decision to design-solution.

## PR Dependencies And Change Impact

Reuse the [BRD's exact PR snapshots and ownership matrix](../brd/brd-ai-workflow-effectiveness.md#in-progress-pr-overlap-check--2026-11-06). They are evidence of inspected pending work, not installed dependencies. Recheck status and heads before source edits. #296/#297 own shared verify-work changes; #296/#297/#298 own their overlapping trace/outcome changes. This plan edits none of those owners.

No requirement meaning or ID is changed during canonical-definition relocation. The approval reference remains in the BRD. Changes to outcomes, exceptions or authority reopen only affected approval/criteria. The publication plan and native consumer verification remain conditional on actual authorized scope.

## RACI And Risks

| Responsibility | Accountable | Responsible | Consulted |
| --- | --- | --- | --- |
| Scope, priority and plan approval | Requesting operator | Maintainer acting as PM/BA | Independent QA |
| Canonical implementation and integration | Repository maintainer | One S1 implementation owner | Existing PR owners for collisions |
| Technical verification | Independent QA | V1 reviewer with implementation evidence | S1 owner |
| Human acceptance / publication / release | Requesting operator | Authorized integrator only after matching grant | QA; agents cannot grant human approval |

Risks: over-decomposition (mitigation: couple one useful behavior, explicit exceptions; ENG); duplicate owners (PR-head recheck and forbidden paths; integrator); keyword-only proof (independent scenario expectations and real ingress; QA); unavailable kit/model/authority (affected-only blocker, no copying or unchecked fallback; orchestrator); unsupported savings claims (AC-005; QA).

## Status And Receipt

- `feature_status: verified` for bounded source-only scope; `approval: approved(requesting operator, 2026-11-06)` for this PRD. Human delivered-feature acceptance remains not assessed.
- `repository_status: source_implemented_technically_verified`; `activation_status: not_required`. Native export/publication parity is not certified.
- Run record: [plan-ai-workflow-effectiveness-20261106.json](../../artifacts/runs/ai-workflow-effectiveness/plan-ai-workflow-effectiveness-20261106.json).
- The linked planning run record retains its pre-approval observations; this PRD records the subsequent operator approval without rewriting historical execution evidence.
- Planning verification: source/overlap evidence reused; three stable requirements map to five stable criteria with accountable owners and lanes. Persisted run-record JSON syntax: PASS via Node JSON.parse. Both required native audits were attempted: `rtk pnpm audit:trace --slug ai-workflow-effectiveness --required` and the slug/workflow/run-id-scoped `rtk pnpm audit:outcome --records --required --dir artifacts/runs/ai-workflow-effectiveness --slug ai-workflow-effectiveness --workflow plan-feature --run-id plan-ai-workflow-effectiveness-20261106`. Both exited 1 before audit execution: `tsx: command not found`, with node_modules missing. Trace/schema validation is NOT RUN, not PASS. No dependencies installed or validators changed. Readiness owner must restore the approved local dependency environment and rerun those commands; this limits machine verification, not the drafted plan's scope or approval state.
- No live model evaluation, application implementation, host activation or release performed. Complete task usage/prices unavailable; no savings estimate.
- Superseding delivery evidence: [walkthrough](../srs/srs-walkthrough-ai-workflow-effectiveness.md), [final covering receipt](../../artifacts/ai-workflow-effectiveness/integration/receipt.json), [independent R2 source-only approval](../../artifacts/ai-workflow-effectiveness/review-r2.md). Historical missing-runtime failures above are retained, not the current verdict. Dependencies were restored under the later scoped operator authorization; registry/trace and positive/negative consumer checks passed. Generation check failed metadata ownership/base-proof validation; no bypass, publication or copyback performed.

## Next Workflow

Bounded source implementation and technical verification are complete. Optional human acceptance and any future registry/native publication require their own authorization; generation metadata ownership/base proof remains unresolved for publication. No extra implementation or duplicate PR work is implied.
