# Brief: Learn from pstack — Project Verification Readiness

lane: direction; snc_tier: high; approval: approved(operator, 2026-11-04)

- slug: pstack-verification-readiness
- operator_profile: technical
- model_tier: strong (capability hint, not premium authorization)
- SNC: S=2 N=1 C=2 total=5 tier=high; shared lifecycle and evidence gates are potentially affected.
- Owner / sponsor / decision-maker / handoff owner: repository maintainer (drafted assumption).
- Validation owner: independent reviewer designated by the maintainer (drafted role).
- repository_status: approved brief saved; activation_status: not_required.

## Executive Summary

Retain agent-skills-standard's governed lifecycle. First adapt pstack's reusable project-local verification instructions and maintained user-journey map, rather than replace SDLC or import its autonomy/model defaults. This is a direction proposal, not implementation or publication approval.

**You said:** inspect open-source pstack and identify what our SDLC and ADLC should improve or learn.

**I assumed:** prefer portable, targeted improvements; preserve current approval, privacy, evidence and release boundaries; no automatic installation, scheduled work, paid evaluation, or external exposure.

## Contract

### Outcome

A fresh agent can discover how to launch and safely exercise a project's real consumer surface, capture observable proof, and clean up without rediscovering the same operational details each task. Existing verify-work remains the technical verdict owner; readiness remains a prerequisite decision, not proof.

### Constraints

- Registry remains portable standards, not a daily app-control runtime (ARCHITECTURE.md §3 and ADR-005).
- Reuse existing project harnesses and scoped evidence records; do not create a second requirements ledger or test runner.
- Project instructions must be derived from inspected source and live observations, not generic commands presented as proven.
- Keep technical verification, business acceptance and release authority separate. No global gate for an unaffected project/slice.
- Respect host tool availability, private data, model eligibility and approval boundaries; no assumed access to Cursor-only tooling.
- Preserve pstack's MIT notices if copying substantial source text; conceptual adaptation does not require importing the plugin.

### Non-Goals

Replace SDLC; invent an ADLC framework; add an ags daily runtime; import all pstack skills; force parallelism or multiple models; mandate daily maintenance; build universal platform drivers; alter production; auto-merge; publish/export or activate new skills in this intake; claim productivity or token savings.

### Acceptance Criteria For The Proposed First Slice

These are proposed future delivery criteria, not checks already passed.

- **AC-01 / REQ-001:** Discover and reuse an existing project verification kit before proposing a new one. Missing prerequisites produce an owned, affected-slice gap, not fabricated commands or a global failure.
- **AC-02 / REQ-001:** Project-local instructions specify launch/readiness, read-only instance doctor, actual user-path drive, evidence capture, cleanup and any executable helper invocation. Include data/auth/reset prerequisites and isolation ownership; an answering port alone is not business readiness.
- **AC-03 / REQ-002:** A small feature index links existing ACs and describes user entry paths, preconditions, stable interaction handles, observable results and known limitations. It does not duplicate editable requirement definitions. Map three representative journeys, or every available journey when fewer exist, with a declared coverage boundary.
- **AC-04 / REQ-001:** Execute one mapped journey through the real consumer entrypoint at a recorded build/source identity. Capture the action, resulting state and applicable side effects; perform cleanup and verify that proof artifacts survive. Unexecuted journeys remain explicitly unverified.
- **AC-05 / REQ-002:** Maintenance distinguishes documentation drift, harness failure and product regression. A product regression cannot be hidden by weakening the map or editing product code in a map-maintenance run. Report clean, changed or blocked with per-journey coverage; exercise every journey claimed covered.
- **AC-06 / REQ-003:** Integrate references into implementation-readiness and verify-work without replacing their existing prerequisite/verdict contracts. A source change invalidates affected proof only; missing drivers remain explicit gaps. Shared instances have one driver owner; isolated runs own their resources.
- **AC-07 / REQ-003:** Demonstrate normal execution, stale-map/regression classification, unavailable-driver handling, and evidence-preserving cleanup using the smallest existing harnesses. Structural/schema checks are not represented as live proof; no new credential, deployment or purchase authority is inferred.

## Why

- **BRD-OBJ-001:** Reduce repeated operational rediscovery while retaining trustworthy verification. Owner: maintainer. Candidate requirement links: REQ-001 through REQ-003.
- Users: agents performing delivery/verification; maintainers reviewing their evidence.
- AS-IS: explicit verification and readiness rules exist (E2–E4). A unified reusable app-local kit and feature-map maintenance contract was not located in the inspected sources (E5); this is bounded negative evidence, not proof of absence across all refs.
- TO-BE: project-specific operational knowledge is discoverable, executable and checked for drift, while requirements and release decisions retain their current owners.
- **SMART metric — proposed validation target, not a measured benefit:** within 14 days of an authorized pilot start, complete two isolated fresh-agent runs of the same mapped journey with no maintainer-supplied navigation/launch instructions, correct outward behavior, retained evidence and no agent-owned process residue. Record discovery time and human interventions against a pre-change baseline. Owner: validation owner. Current baseline: unknown; no speedup target or causal claim until measured.
- Sponsor confirms this target during brief approval; pilot execution itself requires separate matching authorization.

## Comparative Capability Inventory And Priority

| Priority | Capability / lesson | Existing local coverage | Recommended treatment |
| --- | --- | --- | --- |
| P1, first slice | Drive real journeys through a reusable verification kit | verify-work already requires fresh acceptance-criterion-linked runtime evidence; readiness already checks drivers/env/data | Adapt launch/doctor/drive/evidence/cleanup packaging and reference it from existing gates; do not add another verify-work |
| P1, same slice | Maintain navigation and feature-map accuracy | Capability scope trees and AC trace already exist; they are not app-control recipes | Add a lightweight journey index referencing those sources; classify doc/harness/product drift and require live proof for claimed coverage |
| P2, deferred slice | Settle empirical technical forks with disposable prototypes | Honest option cards, visual alternatives, product experiments and throwaway-prototype guidance already exist | Consider explicit bounded engineering-prototype routing only when an unresolved decision benefits from observation; do not mandate prototypes or replace planning |
| P2, deferred slice | Reconstruct how/why and resume context | Context preservation, session reports and source/revision references already exist | Consider a compact evidence capsule with Preserve/Change/Avoid/Risk and explicit unavailable history sources; privacy-scoped and host-adapted, not a new memory database |
| P3, retain and measure | Convert corrections into stronger enforcement | retro-learn already prioritizes deterministic enforcement and requires authorized promotion; blinded evals already exist | Reuse existing learning/eval pathways; investigate demonstrated enforcement failures before adding prompts |
| Retain | Right-sized routing and lifecycle gates | SNC sizing, approvals, workflow discovery and distinct evidence lanes already exist | Keep them; do not import vendor/model defaults, automatic implementation or autonomous merge semantics |

Only the first verification-readiness slice is brainstormed for planning here. Deferred slices require their own scoped intake; this table does not authorize their implementation.

## Options And Recommendation

### A. Extend existing standards with an optional project verification kit — recommended

- Load-bearing assumption: operational rediscovery and map drift are material pain in at least one target project (unvalidated).
- First failure: an existing authorized equivalent already supplies the kit, or a real journey cannot be safely driven with available tools.
- Worst plausible case: stale instructions produce misleading proof or unsafe shared-state interaction.
- Cost to abandon: retire the proposed references/kit without replacing lifecycle state or migrating a runtime. Reuse existing equivalent where found.

### B. Adopt pstack alongside the full lifecycle — not recommended as the default

- Load-bearing assumption: extra routing, host dependencies and autonomy semantics can coexist without authority ambiguity.
- First failure: incompatible gate/model decisions or unavailable proprietary tooling.
- Worst plausible case: an agent treats verification or architectural preference as permission to implement/merge.
- Cost to abandon: remove plugin configuration and reconcile conflicting instructions and project-local outputs. Larger than A.

### C. Defer changes and use current workflows — valid alternative

- Load-bearing assumption: current harness documentation is sufficient or rediscovery costs are negligible.
- First failure: repeated missing operational instructions or stale-map verification causes avoidable intervention.
- Worst plausible case: retain recurring friction, but avoid new maintenance burden.
- Cost to abandon: low; start A from a concrete failing journey later.

## Evidence

Local reference revision: `1c79a7edb22b768ad5362e2e10766df2978e8642`; observations concern checkout bytes inspected, not a claim of a clean worktree. Upstream inspected snapshot: `bb68f2365eceafa0cb2d253112f675acf5f144cc`, pstack manifest 0.15.36. Latest pstack-touching commit returned by GitHub query: `c742dd61706fbacc1b95f1a20b7b988cf096ce6c`. Documentation describes intended behavior, not demonstrated runtime enforcement.

| ID | Claim | Status |
| --- | --- | --- |
| E1 | Registry is standards, not daily runtime; canonical workflows are .agents/workflows | confirmed(ARCHITECTURE.md:83-106,325-336) |
| E2 | Fresh runtime proof, driver preflight and technical/acceptance/release separation already required | confirmed(.agents/workflows/verify-work.md:8-25) |
| E3 | Existing readiness checks approval, affected-scope freshness, drivers/env/test data and partial readiness | confirmed(.agents/workflows/implementation-readiness.md:16-35) |
| E4 | Scope/capability inventory already exists; it is not a runtime journey map | confirmed(skills/product-management/product-requirements/references/requirements-modeling.md:26-61; .agents/workflows/plan-feature.md:24-35) |
| E5 | No unified project-local launch/doctor/drive/evidence/cleanup plus feature-map maintenance contract located in inspected lifecycle/common sources | unknown; bounded search result, not universal capability absence |
| E6 | Existing retrospective enforcement and blinded immutable evaluation mechanisms overlap pstack lessons | confirmed(.agents/workflows/retro-learn.md:11-36; .agents/workflows/evals-run.md:3-38) |
| E7 | pstack generates repo-specific verification instructions, seeds 3–5 feature maps and requires one live journey proof | confirmed([create-verification-skill](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/skills/create-verification-skill/SKILL.md), §§1–4) |
| E8 | pstack maintenance requires source and live coverage, separates drift/regression, and scopes edits to verification directory | confirmed([maintain-verification-skill](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/skills/maintain-verification-skill/SKILL.md), Edit scope and Pass) |
| E9 | Current upstream says suggest maintenance cadence only if asked; daily is not mandatory | confirmed(E7, §5); screenshot cadence is secondary commentary |
| E10 | pstack prototypes are decision-first and throwaway; architect defaults to implementation without human checkpoint | confirmed([prototype](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/skills/poteto-mode/playbooks/prototype.md); [architect](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/skills/architect/SKILL.md)) |
| E11 | how/why/recall provide scoped structural, historical and prior-context reconstruction | confirmed([how](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/skills/how/SKILL.md); [why](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/skills/why/SKILL.md); [recall](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/skills/recall/SKILL.md)) |
| E12 | pstack is MIT; some control tooling is outside this plugin | confirmed([LICENSE](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/LICENSE); [README, not shipped here](https://github.com/cursor/plugins/blob/bb68f2365eceafa0cb2d253112f675acf5f144cc/pstack/README.md#not-shipped-here)) |
| E13 | A separate authoritative ADLC definition was not located; agentic runtime contract is documented | unknown for ADLC definition; confirmed(docs/sdlc-workflow-quick-reference.md:247-281) for documented contract |
| E14 | Existing pstack BRD/PRD/SRS/product ledger was unavailable in this checkout before drafting | confirmed(checkout discovery: docs/brd, docs/prd, docs/srs, docs/product paths unavailable); no canonical product IDs to duplicate |
| E15 | This change reduces elapsed time, cost or human intervention | assumed; unvalidated value hypothesis, no benchmark claim |

## Delivery Context, Stakeholders And Risks

Proposed affected components: existing readiness/verification references, portable common verification guidance and a project-owned operational kit. plan-feature determines exact placement after checking authorized equivalents; no new registry IDs are committed by this brief. Consumer installation doctor is not application business-readiness doctor. Keep detail in references rather than inflating every workflow prompt.

| Stakeholder | Responsibility / approval |
| --- | --- |
| Repository maintainer | Brief/plan owner; chooses target project and publication scope |
| Target project owner | Grants local execution/data authority and accepts project-specific operational instructions |
| Delivery agent | Uses inspected kit and reports actual evidence and limitations |
| Independent reviewer | Checks consumer behavior, evidence freshness and no weakened criteria |
| Host administrator | Owns runtime permissions, provider eligibility and process/environment isolation |

| Risk | Mitigation / owner |
| --- | --- |
| Duplicate or stale source of truth | Link canonical ACs; reuse existing kit; scope freshness checks to changed journeys / maintainer |
| Secret or personal data in evidence | Isolated test data and project-authorized artifact handling / project owner |
| Process leakage or competing drivers | Explicit process/resource ownership, one driver for shared state, cleanup proof / delivery agent |
| Regression hidden as documentation drift | Retain expected criteria and report product failure separately / independent reviewer |
| Token and maintenance overhead | Small index, on-demand detail, change-triggered upkeep rather than mandatory daily full sweeps / maintainer |
| Unproven benefit | Measure fresh-agent baseline before making efficacy or savings claims / validation owner |

Cost-benefit: setup and maintenance effort increase; reduced rediscovery is a hypothesis. No spend estimate or financial savings is supported. No external runtime or cloud fleet is required by this brief.

## Glossary

- **SDLC:** existing software delivery lifecycle and its authority/evidence gates.
- **ADLC:** user-supplied term; authoritative local definition not located. Here, comparison covers documented agentic runtime handoffs and learning only, not a newly defined lifecycle.
- **Feature map:** operational user-journey navigation and proof recipe, not a second PRD/capability taxonomy.
- **Doctor:** read-only check of the correct usable app instance and prerequisites, distinct from ags installation health.
- **Kit:** project-owned instructions and existing harness references; helpers only when needed and authorized.

## PM Handoff Checklist

- [x] Compared pinned upstream mechanisms with local lifecycle sources; distinguished prose contracts from executed tooling.
- [x] Prioritized lessons and bounded the first slice; captured alternatives and negative evidence.
- [x] Drafted owner, value rationale, scope fence, REQ/AC seed and verification expectations.
- [x] Operator approved this brief on 2026-11-04 by replying “ok”; implementation readiness remains separately assessed.
- [ ] plan-feature resolves exact source placement and searches approved equivalent context without reopening settled scope.
- [ ] Project owner selects an authorized pilot surface and data boundary before any live execution.
- [ ] Validation owner captures baseline, then separately authorized runs; independent review and human release gates remain intact.

Stakeholder validation: maintainer reviews the brief asynchronously; no response deadline or automatic approval. Acceptance window is the maintainer's explicit reply, not elapsed time.

## Approval

approved(operator, 2026-11-04). Evidence: operator replied “ok” to the presented brief. Approval applies to this direction brief only, not implementation execution approach, premium consultation, paid evaluations, pilot exposure, publication, merge or deployment.

## Open Questions

Approved defaults: first scope is the verification kit/map loop; repository maintainer is accountable owner. ADLC-specific comparison remains incomplete until an authoritative local/external definition is identified; do not claim parity. Target pilot and runtime permissions are deferred to planning/explicit execution authority, not inferred here.

## Next Workflow

plan-feature, using this approved brief. Use validate-product if empirical value validation becomes a selected deliverable; it is installed, but this brief does not authorize a pilot. Do not implement deferred prototype/context slices under this brief.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "20261104T124857Z-pstack-intake",
  "slug": "pstack-verification-readiness",
  "workflow": "brainstorm-feature",
  "feature_status": "requirements_ready",
  "started_at": "2026-11-04T12:48:57Z",
  "completed_at": "2026-11-04T12:54:58Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001"],
    "requirements": ["REQ-001", "REQ-002", "REQ-003"],
    "acceptance_criteria": ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07"],
    "srs": []
  },
  "completed_evidence": ["Pinned upstream source inspection", "Local SDLC and agentic runtime source comparison", "Direction brief approved by operator on 2026-11-04"],
  "missing_evidence": ["Authoritative ADLC definition", "Target-project baseline and live pilot proof"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable"},
  "agent": {"identity": "omp orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

requirements_ready means the direction contract is ready for planning, not implementation or delivery readiness. Brief approval was recorded after the intake completed, from the operator's explicit “ok” reply on 2026-11-04. No implementation, application execution, tests, benchmarks or scheduled maintenance were performed in this intake.

## Cost Report

get_session_cost(workflow="brainstorm-feature") called. Host input/output/cache/reasoning usage and complete pricing were unavailable; total cost and savings are unknown. MCP counters include worker calls and workflow discovery and are not exclusive actor accounting. No numeric monetary or token-saving claim is made.
