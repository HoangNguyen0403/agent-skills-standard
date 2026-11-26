# Feature Plan: Standalone Brainstorming and SDLC Intake

Status: Approved for repository implementation by the requesting maintainer (“Ok start implement the plan”); Personal + DeepSeek account route explicitly authorized. Release and human acceptance remain separate.
Delivery mode: standard. Slug: brainstorm-sdlc-intake.
Product/approval owner: requesting maintainer. Engineering owner: assigned workflow integration implementer. Verification owner: independent reviewer. These role assignments are proposed; no worker has been assigned.

## Decision Brief

- Introduce `/brainstorm` for collaborative exploration without mandatory delivery artifacts or lifecycle transitions.
- Rename `/brainstorm-feature` to `/sdlc-intake`, titled **SDLC Initiation & Requirements Intake**. Preserve its BRD-lite / Direction contract responsibility and approval boundaries.
- Keep `/plan-feature` responsible for PRD and delivery planning, and `/design-solution` responsible for technical requirements/design. Do not rename those workflows in this change.
- Share a small lifecycle-neutral facilitation reference, not the complete SDLC decision/continuation contract.
- Impact if wrong: exploration may still feel like an intake interview; alternatively, separating it incorrectly could bypass delivery gates or break installed workflow discovery.
- Approval sought: naming, behavioral boundaries, migration scope, and acceptance criteria in this document. Approval does not authorize publication, deployment, paid evaluation, or automatic implementation.
- Execution approach: Subagent-Driven, approved through the implementation request and explicit Personal + DeepSeek authorization. One implementation owner keeps coupled source, routing, and generation changes together; an independent Personal Codex reviewer owns verification judgment.

## Outcome and Guardrails

Objective OBJ-1: Let an operator explore an idea without being pushed into a software delivery commitment.
Objective OBJ-2: Make the actual SDLC intake stage explicit while preserving its downstream contracts.
Objective OBJ-3: Deliver a coherent rename across supported discovery/export surfaces without rewriting historical evidence.

Success is behavioral acceptance against the scenarios below. No measured improvement, adoption target, or timing benefit is claimed. The baseline is the inspected current instructions plus the operator's report, not a comparative runtime experiment.

Naming rationale: `sdlc-intake` communicates lifecycle entry and accommodates feature, operational, process, and technical-direction requests. `frame-feature` lacks lifecycle context; `define-requirements` overlaps the existing PRD and SRS stages; `discover-product` already has a separate customer/market evidence responsibility. The maintainer approved this proposed name with the implementation request.

## Scope

In scope:
- Explore ideas: conversational brainstorming, reframing, contrasting possibilities, synthesis, and optional explicit handoff (REQ-001–003).
- Preserve delivery intake: rename the entry point and retain scope, evidence, approval, lifecycle, and continuation rules (REQ-004).
- Migrate consumers: registries, routing, authored guidance, generated distributions, and applicable installed-update behavior (REQ-005).
- Qualify behavior: scenario evaluations, real workflow discovery, migration and structural checks (REQ-006).

Excluded: redesigning the whole SDLC, modifying product-evidence semantics, introducing new lifecycle states, adding telemetry, implementing prototypes as part of brainstorming, changing provider permissions, installing external frameworks, and releasing the registry.

## Workflow Contracts

### `/brainstorm` — Collaborative Idea Exploration

1. Read supplied context and the smallest relevant local evidence; do not begin with a questionnaire or a repository-wide scan.
2. Follow the operator's requested activity. An explicit request for ideas gets ideas; genuine ambiguity gets one useful open question, not a forced options menu.
3. Explore before evaluating: reframe the problem, consider different mechanisms or adjacent uses, and show concrete examples/sketches where helpful. Offer a manageable set without a mandatory option count.
4. Build on the operator's reactions. Preserve constraints and distinguish their intent from agent proposals; do not invent motivations or evidence.
5. Evaluate when useful or requested, not after every speculative idea. Feasibility claims remain evidence-qualified; generating a possibility is not claiming it is feasible.
6. Finish with useful understanding: a sharper framing, promising directions, an unresolved question, a proposed learning experiment, or a decision to park/stop. No choice or recommendation is mandatory.
7. Default output is chat. Save a neutral exploration note only when requested; it is not an approved BRD. Recommend `docs/brainstorms/<topic>.md` when a repository note is appropriate, without minting an SDLC slug or requiring a repository.
8. No required owner, SMART metric, AC table, approval card, run record, feature status, or automatic successor. No product code, scaffolding, paid experiments, or external side effects. A proposed spike requires a separate authorized execution task.

Keep general honesty, privacy, and action-authorization safeguards. Do not load the whole `common-decision-discipline` skill merely to reuse facilitation: its approval-card and continuation obligations belong to delivery. Use an explicit lifecycle-neutral shared reference; retain SDLC-specific option cards, evidence ledgers, and approval checks in their existing owner.

### `/sdlc-intake` — SDLC Initiation & Requirements Intake

Responsibility: establish why/direction, outcome, constraints, scope, assumptions, and observable criteria in a proportional BRD-lite or Direction contract. Preserve Quick chat-only behavior and Standard/Deep `docs/brd/brd-[slug].md` artifacts.

Preserve current operator-profile inference, SNC risk floors, Why/Direction lane distinction, evidence fidelity, planner checks, approval provenance, pending/high-risk holds, and downstream authority limits. Mint/reuse the delivery slug here, not in standalone brainstorming. Reuse settled exploration context without treating it as approval or verified evidence.

Pending intake remains `not_started` or preserves existing lifecycle; scoped approved intake follows the existing readiness semantics. Planning or validation follows the actual result and existing continuation policy. Intake approval never grants implementation, spend, release, or activation authority.

### Routing and Handoff

| Operator intent / state | Route or result |
| --- | --- |
| Explore, riff, compare possibilities, or think without delivery commitment | `brainstorm`; a valid endpoint in its own right |
| Stop, park, or retain several possibilities | End exploration; no mandatory successor |
| Explicitly turn a selected direction into a delivery brief | `sdlc-intake`, carrying the context below |
| Delivery request lacks a scoped Why/Direction contract | `sdlc-intake` directly; brainstorming is not a prerequisite |
| Sufficient approved requirements already exist | Existing appropriate downstream stage; do not repeat intake |
| Customer/market evidence is required for a product decision | Existing `discover-product` / `validate-product` responsibilities |
| Defect investigation or active incident | Preserve `dev-fix` / `incident-hotfix` routing when action is requested |

An explicit promotion carries only available context: problem framing, operator-stated intent/constraints, explored directions, selected direction if any, assumptions, evidence references with uncertainty, and unresolved questions. Do not fabricate approval, IDs, hashes, or requirements readiness. A bare “looks good” about an idea is not authorization to enter delivery. Existing autonomous SDLC continuation preferences must not silently promote standalone brainstorming.

## Canonical Requirements

All requirements are approved for repository implementation, priority P1, owned by the engineering integration owner, and approved by the requesting maintainer.

| ID | Requirement | Objective |
| --- | --- | --- |
| REQ-001 | Provide generative, adaptive brainstorming rather than mandatory intake interrogation. | OBJ-1 |
| REQ-002 | Permit useful terminal exploration without delivery state or required artifacts. | OBJ-1 |
| REQ-003 | Support explicit, context-preserving promotion without transferring approval authority. | OBJ-1, OBJ-2 |
| REQ-004 | Rename the SDLC intake while preserving its existing delivery and safety obligations. | OBJ-2 |
| REQ-005 | Publish one unambiguous active workflow identity per responsibility across consumers. | OBJ-3 |
| REQ-006 | Demonstrate behavioral separation and discovery/migration correctness using appropriate evidence. | OBJ-1, OBJ-2, OBJ-3 |

## Acceptance Criteria

Verification owner for every criterion: independent reviewer; implementer supplies the evidence. Behavioral evaluation means inspecting actual response/action transcripts, not searching for compliant phrases.

| ID | Req | Given / when | Required observable result | Verification lane |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Operator requests creative ideas with adequate context. | Offers concrete, meaningfully distinct possibilities before asking for owner/metrics/scope commitment. | Behavioral evaluation |
| AC-002 | REQ-001 | Intent is genuinely ambiguous. | Asks one relevant open question without inventing motives; builds on the reply rather than restarting intake. | Behavioral evaluation |
| AC-003 | REQ-002 | Operator says “not ready to build,” including outside a repository. | Provides useful exploration without BRD, required file creation, feature-status mutation, or planning handoff. | Behavioral evaluation |
| AC-004 | REQ-002 | Operator parks the idea or keeps several possibilities. | Ends without requiring a winner, recommendation, approval, or successor. | Behavioral evaluation |
| AC-005 | REQ-003 | Operator explicitly requests a delivery brief after exploration. | Intake reuses stated facts and preserves assumptions without re-interviewing settled context. | Behavioral evaluation |
| AC-006 | REQ-003 | Operator merely endorses an idea, including with an inherited auto-continue preference. | Does not treat that endorsement as delivery promotion or implementation authority. | Behavioral evaluation |
| AC-007 | REQ-004 | Direct routine delivery request or already-approved requirements. | Uses the appropriate intake/downstream path without imposing standalone brainstorming. | Behavioral evaluation |
| AC-008 | REQ-004 | Pending or sensitive/high-tier intake. | Preserves existing approval holds and risk floors; emits no unauthorized readiness or action. | Behavioral evaluation |
| AC-009 | REQ-004 | Quick intake with sufficient context. | Retains proportional chat-only contract rather than adding mandatory documents. | Behavioral evaluation |
| AC-010 | REQ-005 | Fresh supported installation and workflow lookup. | Exposes `brainstorm` and `sdlc-intake` with distinct descriptions and correct bodies; old active command is absent. | Consumer integration |
| AC-011 | REQ-005 | Update from the prior generated workflow set. | Retires generator-owned old exports safely; preserves user-edited conflicts and reports them rather than deleting them. | Migration integration |
| AC-012 | REQ-005 | Existing historical briefs, run records, or sealed evaluation evidence reference the old name. | Leaves their bytes/identity unchanged; they are not silently rewritten as new approvals. | Migration integration |
| AC-013 | REQ-006 | Audit/discovery and behavioral qualification run. | Reports structural and behavioral results separately; keyword compliance or static parity alone cannot establish a successful brainstorm. | Evidence review |

## Implementation Plan

### P0 — Freeze boundaries and map consumers (prerequisite; S, high confidence)

Owner: integration owner. Consumers: S1 and S2.
- Confirm the name and execution approach. Inventory active versus historical references and generator-owned versus authored files before edits.
- Record an obligation ledger from current `brainstorm-feature` clauses to their retained destination. Explicitly identify only the facilitation content to share.
- Inspect installed-update ownership/retirement paths and workflow lookup validation; resolve whether historical names are merely display data or validated records. Do not add runtime aliases preemptively or tighten historical validation incidentally.
- Artifact: bounded worker briefs, ownership map, obligation ledger, and frozen evaluation prompts/oracles.
- Gate: approved scope and approach. Control: no implementation or historical mutation. Rollback: discard draft mapping; reversibility: revertible.

### S1 — Rename delivery intake end to end (mechanical_refactor; M, medium confidence)

Owner: one integration implementer. Depends on P0. Covers REQ-004–005.
- Rename `.agents/workflows/brainstorm-feature.md` to `.agents/workflows/sdlc-intake.md`; update its workflow identity and exact cost-call name while retaining obligations.
- Migrate active routes in `.agents/workflows/sdlc.md` and `monitor-respond.md`.
- Update `scripts/workflow-chain.ts`, relevant lists/rules in `scripts/audit-sdlc.ts`, `cli/src/constants/index.ts`, and affected test expectations, including `scripts/audit-sdlc.product-evidence.test.ts`.
- Migrate current shared guidance references under `common-decision-discipline`, `common-operator-profile`, and `common-software-requirements`; identify further active callers before changing them. Preserve historical reports and superseded decision records.
- Update current user-facing guidance in README, CONTRIBUTING, architecture current-state sections, and SDLC quick reference. Add a migration notice explaining the removed command; do not retain a compatibility workflow or dual canonical path.
- Regenerate supported host exports through the existing ownership-aware isolated staging process. Do not hand-edit generated mirrors or force recovery past provenance refusals.
- Demonstrate real workflow discovery for the new name, old-command retirement on update, and preserved historical artifacts.
- Gate: integrated canonical and generated migration passes review. Control: same intake authority and outcome semantics. Rollback: revert the complete rename/export set, not individual consumers; reversibility: revertible.

### S2 — Standalone brainstorming and explicit promotion (feature; M, medium confidence)

Owner: same integration implementer because registry/routing and shared guidance overlap S1. Depends on S1.
- Add `.agents/workflows/brainstorm.md` with the contract above and a nonbinding conversational synthesis example, not a mandatory form.
- Add one lifecycle-neutral facilitation reference under `skills/common/common-decision-discipline/references/`; both workflows reference that file directly where appropriate. Remove duplicate facilitation prose rather than creating a second independent rule set. Do not weaken the parent SDLC skill.
- Register `brainstorm` for default discovery/export alongside `sdlc-intake`. Add its explicit `WORKFLOW_RULES` entry; keep it outside `CORE_SDLC_CHAIN` and the SDLC runtime-contract list. No invented run-record or lifecycle enum is needed.
- Adjust routing descriptions so exploratory intent wins over generic feature/intake keywords. `/sdlc` may explain or route an explicitly exploratory request to the terminal standalone workflow without creating delivery state; delivery intent still routes to intake.
- Add explicit promotion instructions and context-only handoff. Retain existing product discovery and incident/bug boundaries.
- Update onboarding/quick reference with an exploration-versus-delivery choice and examples. Regenerate exports with the same ownership-safe mechanism as S1.
- Demonstrate direct lookup and actual multi-turn behavior, including park/stop and explicit promotion.
- Gate: AC-001–007 and discovery evidence. Control: no delivery-state leakage or new action authority. Rollback: revert standalone workflow, registrations, shared-reference extraction and exports together; reversibility: revertible.

### Q — Independent qualification and integration acceptance (verification; M, medium confidence)

Owner: independent reviewer, never the implementation owner. Depends on S1 and S2.
- Run frozen scenario prompts against baseline and candidate where comparison is meaningful, holding host/model/settings constant. Report transcript evidence and differences, not an invented improvement percentage.
- Use adversarial controls: a response that says “no planning” but writes a BRD, silent successor execution, fabricated assumptions presented as user intent, and forced approval after a park request must fail.
- Compare the obligation ledger with the new intake; inspect actual discovery and update artifacts. Cover both Why and Direction lanes and the sensitive-change guard.
- Existing evaluation home is `skills/common/common-decision-discipline/references/brainstorm-evaluation.md`; inspect its linked cases before choosing exact new case paths. Preserve prior sealed results; create a new revision/run for new behavior.
- Correct findings in the owning slice, then recheck only affected criteria. No release or installation into the user's live setup is implied.
- Gate: all criteria pass or a named unmet criterion blocks delivery. Control: no weakened oracle or substituted static proof. Rollback: return the affected slice for correction; release remains unperformed.

## Verification Commands and Evidence Boundaries

Commands below are planned, not executed. Derive exact targeted CLI/MCP/behavioral test filters from the existing runner during P0; do not invent a runner or test source text instead of behavior.

- `rtk pnpm audit:sdlc` — workflow registration, structural rules and routing consistency.
- `rtk pnpm test:sdlc` — existing SDLC product-evidence regressions.
- `rtk pnpm test:outcome` — renamed core-chain outcome templates and existing record behavior.
- Focused existing CLI and MCP consumer tests plus a real `list_workflows` / `get_workflow` lookup for both new names, using the candidate artifacts rather than the currently mounted server.
- Existing isolated generation/parity checks for affected outputs and prior-install migration fixtures. Load generator-safety, evidence-preservation and ownership-retirement standards before running generators; never regenerate directly over unsealed work.
- Behavioral scenarios AC-001–009 through the approved evaluation route. Paid/external model calls need separately authorized scope and cost; if unavailable, report NOT RUN, not PASS.
- Review migration documentation and changelog, then obtain human acceptance of the experience. No broad unrelated suite is required.

## Migration, Risks, and Release Boundary

- Active `brainstorm-feature` commands/references are removed in one coherent cutover. Intentional mentions in migration notes and historical evidence remain; a zero-occurrence repository grep is not the acceptance rule.
- Do not rewrite existing BRDs, slugs, approval hashes, run records, archived evaluations, or historical changelog entries. A resumed old task uses its original evidence with current routing, not relabeled approval authority.
- Generator-owned obsolete files may be retired only through established ownership checks. User-edited obsolete exports require a visible conflict, not destructive cleanup or silently competing commands.
- Risk: full `common-decision-discipline` loading reintroduces intake behavior. Mitigation: direct neutral-reference consumption and behavioral leakage cases.
- Risk: an installed stale workflow remains discoverable. Mitigation: both fresh-install and upgrade consumer checks, not just canonical file inspection.
- Risk: shared wording changes weaken SDLC gates. Mitigation: obligation ledger and independent sensitive/pending-intake cases.
- Document the breaking command rename in the next unreleased changelog entry. Version/release selection and publication are separate maintainer decisions; this plan performs neither.

## Evidence and Status

Confirmed sources: `.agents/workflows/brainstorm-feature.md`, `sdlc.md`, `discover-product.md`; `skills/common/common-decision-discipline/SKILL.md` and `references/explore-mode.md`; `scripts/workflow-chain.ts`; `scripts/audit-sdlc.ts`; `cli/src/constants/index.ts`; `package.json`; current authored documentation references found during planning.

Prior comparative research: [Superpowers brainstorming](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md), [gstack builder brainstorming](https://github.com/garrytan/gstack/blob/main/office-hours/sections/phase-2b-builder-brainstorm.md), [ECC requirements intake](https://github.com/affaan-m/ECC/blob/main/commands/plan-prd.md), [pstack reframe](https://github.com/cursor/plugins/blob/main/pstack/skills/reframe/SKILL.md). These are mutable upstream references, not qualified dependencies or runtime proof.

Implementation authorized; verification, independent review, generation, publication, and deployment have not yet run at dispatch. No run identifier, execution receipt, measured cost, or additional approval is implied.

## Execution Assignment

### Task 1: Implement standalone brainstorming and SDLC intake cutover

**Scope / owned write set:** `.agents/workflows`, `skills/common/common-decision-discipline`, `skills/common/common-operator-profile`, `skills/common/common-software-requirements`, `scripts/audit-sdlc.ts`, `scripts/workflow-chain.ts`, `scripts/audit-sdlc.product-evidence.test.ts`, `scripts/outcome`, `scripts/generation`, `scripts/skill-tests`, `cli/src`, `mcp/src`, `mcp/test`, `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `docs/sdlc-workflow-quick-reference.md`, `docs/getting-started-product-owner.md`; generator-produced surfaces only under configured host roots and metadata/index outputs. Other paths require an ownership request first.
**Inputs:** This approved plan, all AC-001–013, canonical current workflow and generation/ownership contracts.
**Outputs:** Complete canonical cutover, neutral shared facilitation, supported host exports, targeted regression/consumer evidence, and obligation ledger.
**Real Ingress:** Candidate workflow list/get consumers, fresh/update SyncService workflow installation, SDLC/outcome audit commands, approved behavioral scenario transcripts.
**Invariants:**
- Positive: `brainstorm` is standalone and `sdlc-intake` retains existing Why/Direction intake authority; both are discoverable through candidate consumers.
- Negative: No automatic delivery promotion, historical-evidence mutation, unsafe orphan deletion, compatibility workflow, release, or deployment.
**Gate / rollback:** none: repository-only atomic cutover; control: approval and ownership boundaries preserved; rollback: revert; reversibility: revertible
**Verification owner:** orchestrator and independent Personal Codex reviewer via `rtk pnpm audit:sdlc`, `rtk pnpm test:sdlc`, `rtk pnpm test:outcome`, targeted real consumer discovery/update checks.
**Handoff / freeze:** `.agent/sdd/brainstorm-sdlc-intake/task-1-report.md` marked FINAL; stop all writes before independent review; include changed paths, exact commands/results, obligation ledger, source identity and unrun criteria.
**Correction route:** One concrete corrective follow-up; further quality failure or observed exhaustion goes only to eligible Personal Delivery; no premium escalation without separate human approval.

Execute P0, S1, and S2 in this one implementation context. Preserve shared ownership; no recursive delegation or worker commits. Skip checks during source churn and run focused checks once after settling source. Orchestrator owns final acceptance checks and commit.
