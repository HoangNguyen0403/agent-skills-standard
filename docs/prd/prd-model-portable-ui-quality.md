# Feature Plan: Model-Portable UI Quality

Status: approved plan; owner: requesting repository maintainer
slug: model-portable-ui-quality
operator_profile: hybrid; lane: both; snc_tier: medium; model_tier: standard
delivery_mode: standard
source_approval: approved(requesting-maintainer, 2026-11-06)
source_revision: BRD approved state, read snapshot 6807
plan_approval: approved(requesting-maintainer, 2026-11-06)
execution_approach: subagent-driven
repository_status: assessment_delivered_reviewed; activation_status: not_required

## Decision Brief

- **Changes since approved brief:** Delivery decomposition and explicit evidence/authority gates only. Preserve BRD-OBJ-001, REQ-001–004 and AC-001–006. The approved BRD is historical scope authority; the tables below are the canonical delivery definitions for this first slice.
- **Recommendation:** Assess existing guidance and specify a calibrated, runnable evaluation protocol before changing design skills or building evaluation machinery. A documented no-change conclusion is valid.
- **Impact if wrong:** More rules may add context cost without improving UI; an aesthetic-only benchmark could reward fashion while hiding broken tasks or content loss.
- **Evidence and limitations:** Reuse the approved BRD ledger and bounded scout findings. Existing guidance already supports product grounding, preservation, accessibility and browser verification. Inspected UI evals and reported scores concern response text, not rendered task success. No live generated output, calibrated review or cross-provider improvement has been established.
- **Unresolved execution decision:** Exact eligible models, tool/runtime capability, reviewer assignments and spend allowance — accountable owner: requesting maintainer; affects empirical execution only, not the offline inventory/rubric/protocol preparation.
- **Approval recorded:** The requesting maintainer approved this plan and the recommended Subagent-Driven approach on 2026-11-06. This does not authorize UI-generation runs, downloads, external mutations, later implementation or publication outside the local assessment documents.
- **Independently ready work:** A and B below can be prepared in parallel after plan/execution approval, without paid inference. C integrates their results. Existing research must be reused, not repeated as an unbounded audit.

## Outcome And Guardrails

**Objective:** BRD-OBJ-001. Give maintainers an evidence-backed diagnosis and a decision-ready protocol for evaluating whether targeted changes improve UI across a declared model set.

**Success metric:** Carry the approved BRD SMART metric and thresholds unchanged; the 30-day window starts only after separately authorized evaluation starts. The current slice prepares the evidence contract, not a claim that the metric has been achieved.

**Guardrails:** Preserve task behavior, content fidelity, product identity, human taste authority, accessibility and reduced-motion needs. Separate objective failures, context concerns and subjective preference. Do not replace the current product-aware rules with global bans on fonts/colors/cards or mandatory minimalism. No external code, datasets, assets or skill prose imports. Do not treat token economics, stars, transcript assertions or a checker saying PASS as measured usability improvement.

## Scope And Non-Goals

### In Scope

Establish UI quality evidence:
- **Inventory capabilities** — in_scope, REQ-001.
- **Define assessment rubric** — in_scope, REQ-002.
- **Specify comparison protocol** — in_scope, REQ-003.
- **Rank leverage points** — in_scope, REQ-004; provisional until empirical evidence exists.

Actors: repository maintainer, design-skill analyst, evaluation-protocol owner and independent reviewer. Trigger: approved brief. Result: reviewed inventory/rubric/protocol/recommendations. Exceptions and proof boundaries are defined by the canonical AC rows and decision rules below. This is a web UI assessment contract, not a shipped end-user feature.

### Out Of Scope

Application redesign, native Mobile UI, design editor, component/animation library adoption, mandatory new design-file format, global aesthetic detector, model routing, production exposure, deployment, spending or publishing. No database/API/runtime contract changes are part of this slice.

### Deferred

- **Execute the experiment** — separate `validate-product` authorization linked to this PRD's REQ-003, after protocol review and runtime/account/budget confirmation.
- **Change canonical design guidance** — subsequent scope decision tied to REQ-004 findings; never automatic after this plan.
- **Implement a rendered-output runner** — subsequent `design-solution` if existing authorized tools cannot satisfy the reviewed protocol. No runner architecture is selected here.

These are linked future scope decisions, not invented Jira commitments or implicit implementations.

## Requirements And Acceptance Criteria

All requirements serve BRD-OBJ-001. Owner roles inherit the maintainer-approved responsibility defaults; actual worker identities are selected at dispatch. Priorities are planning recommendations. Requirements remain proposed, not implemented or empirically verified.

| Req ID | Requirement | Owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Identify canonical UI capability owners, provenance and bounded evidence gaps without duplicating existing conventions. | Design-skill analyst | P0 | Proposed | BRD-OBJ-001 |
| REQ-002 | Provide an anchored, product-contextual assessment rubric that distinguishes defects, context concerns and taste. | Design validation owner | P0 | Proposed | BRD-OBJ-001 |
| REQ-003 | Specify a reproducible cross-model baseline/candidate comparison with observed UI, fair attempts, independent judgment and honest failure accounting. | Evaluation-protocol owner | P0 | Proposed | BRD-OBJ-001 |
| REQ-004 | Produce prioritized, owner-local recommendations from the evidence, allowing no change and identifying unvalidated hypotheses. | Repository maintainer | P1 | Proposed | BRD-OBJ-001 |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Existing canonical design, accessibility, state/browser and eval sources plus the approved research | The analyst prepares the inventory | Each capability records an exact source, owner, observed coverage and lookup limit; instruction coverage is not represented as execution, and unassessed capability is not represented as absent. | Design-skill analyst | Manual source/evidence review |
| AC-002 | REQ-002 | The approved rubric dimensions and diverse web product tasks | The validation owner reviews the assessment specification | The rubric gives observed-region/state anchors for task clarity, hierarchy, typography/readability, spacing/density, brand fit, content fidelity, responsive behavior and interaction states; separates hard defects from preference; and allows intentional neutral or expressive designs without awarding novelty by default. | Design validation owner | Manual rubric calibration review |
| AC-003 | REQ-003 | The approved six task categories, model-matrix minimum and fixed comparison conditions | The protocol owner specifies the experiment | The protocol describes six fixed briefs, at least three independently pinned eligible models across at least two providers, two runs per brief/model/arm, and retained runnable artifacts, loaded-guidance identity, source revisions, model/settings, captures and attempt/failure provenance; minimum 36 outputs per arm, 72 total. | Evaluation-protocol owner | Manual reproducibility review |
| AC-004 | REQ-003 | A generated output or execution failure in a planned comparison | The reviewer follows the observation protocol | The protocol requires actual desktop/mobile rendering, task/keyboard/content and applicable accessibility checks; treats unrenderable outputs as failures, infrastructure failures as unresolved evidence, and critical task/accessibility failures as non-offsettable by aesthetic preference. | Independent QA reviewer | Manual observation/failure-policy review |
| AC-005 | REQ-003 | Paired outputs from the same brief and model | The protocol assigns review and aggregation | Two independent reviewers receive blinded, randomized pairs under equal assets/tools/generation and repair allowances; the validation owner adjudicates disagreement; results retain per-model wins/ties/failures, sample uncertainty and the approved adoption/repair guardrails, without substituting transcript assertions for observed quality. | Independent QA reviewer | Manual comparison-policy review |
| AC-006 | REQ-004 | The inventory, rubric, protocol and supplied-reference findings | The maintainer reviews the recommendation | Each recommendation links an observed failure or explicitly unvalidated hypothesis to an existing owner, expected benefit, cost to abandon and required proof; references are marked already-covered/adapt-principle/unassessed/unsupported, imports are excluded, and no-change is a permitted outcome. | Repository maintainer | Manual decision/evidence review |

These ACs verify the first slice's assessment/protocol deliverables. They do not state that the future experiment has run or that its quality targets pass. The approved BRD contains the historical intake wording; downstream artifacts reference these IDs rather than duplicating definitions.

## Comparison And Evidence Decision Rules

**Arms:** Baseline uses the existing canonical guidance at a frozen revision; candidate uses one explicitly identified proposed change set with the same base. A no-skill arm is optional future scope, not a substitute for assessing the guidance we currently ship. Candidate changes are not implemented by this plan.

**Task inputs:** Each fixed brief specifies a named audience, primary task, content/assets, brand constraints and permitted change tier. Existing-screen briefs supply the same baseline implementation to both arms. Each task declares applicable states, required content and task-success conditions before generation. Freeze responsive viewports, capture conditions, tool access and attempt allowances before any paid run; exact values belong to the reviewed protocol, not an assumed existing environment.

**Rubric calibration:** Use synthetic or already-authorized example artifacts clearly marked as calibration-only. The protocol owner records ambiguous anchors and reviewer disagreements; calibration examples cannot count as model-efficacy results. If no suitable artifacts are available, keep calibration pending with the validation owner rather than inventing scores.

**Variables:** Brief, model/provider/version/settings, arm and repetition are recorded separately. Repeated labels do not count as distinct models. Record actual settings and unsupported/unknown effort rather than treating vendor effort vocabularies as equivalent.

| Observed condition | Required disposition |
| --- | --- |
| Guidance not selected or not supplied | Loading/activation finding; do not label as the rule's visual efficacy. |
| Guidance supplied, model output contradicts it | Compliance finding, supported by artifact and instruction provenance. |
| Rule followed but product/task quality remains poor | Candidate guidance/context gap; assess model/tool limits before recommending more rules. |
| Output cannot run because generated code is invalid | Generated-output failure; retain attempt, not a dropped sample. |
| Browser/provider unavailable | Infrastructure failure; affected comparison unresolved, not quality PASS. |
| Critical accessibility/task failure | Hard defect reported separately from taste; apply BRD adoption guardrails. |
| Preference disagreement or tie | Preserve raw ratings; validation owner adjudicates; ties are not wins. |
| No supported improvement | Retain existing guidance and report no demonstrated improvement. |

Reviewer calibration and paired preference provide expert assessment, not end-user usability or causal ROI proof. The baseline itself can contain defects; beating it never makes unresolved defects acceptable.

## Implementation Plan And Task Slices

The orchestrator owns integration and the final plan; workers must not delegate or widen scope. These are deliverable assignments, not authority to edit implementation. Suggested artifact locations are new assessment files under `docs/product/model-portable-ui-quality/`; they are not a new canonical product-ID ledger.

| Slice | Single owner / component boundary | References | Expected artifact | Dependencies | Estimate / confidence | Routing |
| --- | --- | --- | --- | --- | --- | --- |
| A: Map current leverage | Design-skill analyst owns `capability-audit.md` only; source skills are read-only | REQ-001/004; AC-001/006 | Compact exact-source inventory and reference-disposition/recommendation shortlist, reusing intake research | Plan and execution-approach approval | S / high | S=0 N=1 C=0, low; eligible analysis profile, read-only source work |
| B: Specify evaluation | Evaluation-protocol owner owns `evaluation-protocol.md` only; no runner/source edits | REQ-002/003; AC-002–005 | Fixed task definitions, rubric anchors, calibration method, observation/failure policy, review and aggregation specification | Plan and execution-approach approval; independent of A using existing evidence | M / medium | S=0 N=2 C=1, medium; eligible analysis profile |
| C: Integrate decision | Orchestrator owns cross-links and any plan-status updates; no edits to A/B without ownership handback | REQ-001–004; AC-001–006 | Consistent assessment/protocol handoff and explicit remaining prerequisites | A and B | S / high | S=0 N=1 C=1, low; existing orchestrator |
| D: Independently review | Reviewer owns findings only, separate from A/B authors | AC-001–006 | Criterion-by-criterion evidence and contradictions/failure-accounting findings | Integrated C | S / medium | S=0 N=1 C=1, low; eligible review profile |

A and B are dispatched together only after their exact files/interfaces, eligible profiles and execution approach are settled. Shared interface: stable REQ/AC IDs, approved BRD metric, frozen-source references, hard-defect/context/taste categories and evidence status vocabulary. B must not presume an unevaluated shortlist item is an implemented candidate. C resolves overlaps without adding another UI convention. Workers return owned files, AC evidence, commands if any and unresolved risks; no mid-flight tests/build/lint/formatters. Independent review cannot authorize the plan or empirical execution.

Estimates are relative deliverable sizes, not time, price or model-spend commitments. Research/review use eligible analysis profiles, not the implementation fallback ladder; no premium escalation is implied. The project/account domain must be established from host/project context before profile dispatch; if unresolved, ask rather than send context to an ineligible account.

### Verification And Completion Boundary

Use the AC-row lanes; no runtime behavior is changed by this planning artifact. For future A/B delivery, independently read the referenced canonical evidence and walk a success case, a generated-code failure, an infrastructure failure, a tie and a critical regression through the specified policy. This is protocol consistency proof, not execution of the 72-output experiment. Record calibration as pending if example artifacts are unavailable.

For this plan, validate its persisted Outcome RunRecord through the existing `scripts/outcome/index.ts --records --required` entrypoint, scoped by slug/workflow/run ID. Schema/scope success is not plan approval or empirical acceptance. No application smoke run or broad test suite is warranted by documentation-only planning.

## Accountability And Risks

- **Accountable Product/BA owner:** requesting repository maintainer, for all requirements and scope decisions.
- **Responsible engineering/analysis owners:** A/B component owners, for their assigned deliverables only.
- **Accountable QA/validation owner:** maintainer responsible for design/eval acceptance; independent reviewer verifies the authors' evidence.
- **Consulted:** designers and consuming developers for task/brand fit and repair burden.
- **Release owner:** registry maintainer; publication/activation not in scope, so no release consent is inferred.

Carry the BRD glossary and risks unchanged. A owns avoiding duplicate guidance and homogenous aesthetics; B owns fair comparison, failure accounting, uncertainty and model-setting provenance; C owns scope and no-import boundaries; D owns independent evidence review. No transition migration or production rollout is planned.

## Open Consequential Decisions

| Decision | Accountable owner | Affected slice | Required input / authority |
| --- | --- | --- | --- |
| Accept delivery decomposition and execution approach | Requesting maintainer | Dispatch A/B | Resolved: plan and recommended Subagent-Driven approach approved by “ok” on 2026-11-06. |
| Freeze eligible models, versions, allowances and reviewers | Requesting maintainer with evaluation owner | Future experiment only | Validated protocol, authorized accounts/runtime, spend/resource cap and explicit execution consent. |
| Select a candidate or retain current guidance | Requesting maintainer | Later guidance changes | Reviewed findings and matching change authorization; no candidate silently assumed. |

## Status And Receipt

feature_status: requirements_ready; plan_approval: approved(requesting-maintainer, 2026-11-06); assessment_completed: true; empirical_validation: not_run

Run record: [plan-2026-11-06.json](../../artifacts/runs/model-portable-ui-quality/plan-2026-11-06.json). This is a planning receipt, not a signed authorization or model-quality result. No fresh empirical evidence was produced during planning.

Planning verification: built-in Node consistency smoke passed JSON parsing, trace IDs with one canonical requirement/AC row each, pending approval/execution state, source/next-workflow existence and the 72-output matrix arithmetic. Canonical scoped schema validation was attempted but could not start: `pnpm exec tsx` reported `Command "tsx" not found`. No dependencies were installed; canonical schema validity remains unverified.

Delivered: [capability audit](../product/model-portable-ui-quality/capability-audit.md) and [evaluation protocol](../product/model-portable-ui-quality/evaluation-protocol.md). Independent review passed AC-001–006; [review receipt](../../artifacts/runs/model-portable-ui-quality/review-2026-11-06.md) records evidence, minor matrix clarification and logical smoke limits. Assessment completion is not calibration, experiment execution, maintainer acceptance or improved UI proof.

## References

- [Approved BRD and evidence ledger](../brd/brd-model-portable-ui-quality.md), approved 2026-11-06; scope and metric authority.
- `skills/common/common-ui-design/SKILL.md`, `references/human-direction.md`, `evals/evals.json`: existing design owner, preservation/critique rules and text assertions.
- `skills/common/common-accessibility/SKILL.md`; `skills/common/common-web-visual-testing/SKILL.md` and `references/scenarios.md`: existing accessibility and observation guidance.
- `evals-report.md:4,150`; `scripts/evals/execute.ts:31-74,146-174`: existing evidence and executor limits.
- External links and assessed/unassessed boundaries remain in the approved BRD; no duplicate external research is implied.

## Next Workflow

Current next workflow: `null` (proposal-only). The assessment/protocol slice is delivered and independently reviewed. Resume `validate-product` only with candidate, runnable fixtures, exact eligible model/settings, calibrated reviewers, runtime, finite enforceable budget/window and authenticated consent. If new runner architecture becomes necessary, route that later slice to `design-solution`; source implementation requires its own scope/authority and `implementation-readiness`. No empirical run is authorized by completing this slice.

## Execution Assignment Contracts

Placement benefit: A and B independently produce reviewable analysis over separate output documents; independent review remains separate from both authors. Account domain: personal open-source repository, supported by origin `HoangNguyen0403/agent-skills-standard` and registered project `prj_24334e6778b1395c`. Use the existing Personal · Analysis & Review profile exactly. That profile is read-only: workers return complete proposed document bodies; the orchestrator alone publishes their accepted prose. Owned paths below are output responsibility, not permission for worker filesystem mutation.

### Task 1: Audit Current Leverage

**Scope / owned write set:** Proposed content for `docs/product/model-portable-ui-quality/capability-audit.md`; worker has no write permission.
**Inputs:** Approved BRD, this PRD, canonical UI direction/human-direction, accessibility, browser-verification guidance, UI evals and report; reuse prior evidence and inspect only necessary source ranges.
**Outputs:** Complete proposed markdown document with exact-source inventory, reference dispositions and ranked owner-local recommendations for AC-001/006.
**Real ingress:** Maintainer-approved first-slice assessment of current registry guidance, not an application UI redesign.
**Invariants:** Evidence must retain its observed, inferred or unknown status.
**Positive:** Cover all canonical owners and supplied-reference disposition boundaries; describe task-visible quality failures or clearly label hypotheses.
**Negative:** No source edits, imports, installs, paid UI generations, universal aesthetic bans, or claims of measured efficacy.
**Verification Owner:** Orchestrator plus a separate eligible review agent checks AC-001/006 against the cited sources.
**Handoff / freeze:** Return FINAL with complete document body, AC evidence, consulted paths and remaining risks; stop all work until a same-scope corrective assignment.
**Correction Route:** One concrete corrective follow-up for failed AC; unresolved account/profile issue returns to orchestrator without fallback or delegation.

### Task 2: Specify Bounded Evaluation

**Scope / owned write set:** Proposed content for `docs/product/model-portable-ui-quality/evaluation-protocol.md`; worker has no write permission.
**Inputs:** Approved BRD and PRD, product experimentation/evidence/metrics standards, existing UI/browser evaluation guidance and known text-runner limits.
**Outputs:** Complete proposed markdown document with six concrete fixed briefs, anchored rubric, capture/task/state checks, calibration examples, comparison/failure policy and finite proposal-only execution bounds for AC-002–005.
**Real ingress:** Future baseline-versus-candidate generated web UI comparison; this assignment specifies it and cannot execute it.
**Invariants:** Preserve approved matrix, success thresholds, task/content/brand guardrails and separate authorization boundary.
**Positive:** Make success, failure, infrastructure gaps, ties and critical regressions independently classifiable; specify each brief sufficiently for another operator to reproduce.
**Negative:** No invented results/authorization, source edits, reference imports, installations, model benchmark runs, financial ROI or changed adoption thresholds.
**Verification Owner:** Orchestrator plus an independent review agent walks the declared edge cases and checks AC-002–005.
**Handoff / freeze:** Return FINAL with complete proposed document, AC evidence and unverified runtime/authority prerequisites; stop until a same-scope corrective assignment.
**Correction Route:** One concrete corrective follow-up; material design or authorization change returns to orchestrator; no recursive delegation.


## Cost Report

Workflow telemetry is requested at handoff. Aggregate host tokens, quota consumption, total actor cost and pricing are unavailable; no monetary estimate or savings is claimed.
