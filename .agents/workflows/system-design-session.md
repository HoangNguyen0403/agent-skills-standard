---
description: Run an interactive system design session that turns a product goal into a scoped, evidence-qualified architecture and handoff.
---

# System Design Workflow

## Goal

Goal: Produce an evidence-qualified system design and handoff to `design-solution`, holding unresolved material decisions and distinguishing design readiness from implementation or operations.
## Steps

1. **Load context.** Read the product goal and relevant architecture. Review-existing mode uses current traffic/incident evidence when available. Load `system-design-methodology` and only relevant siblings: `system-design-data-architecture` for consequential flows, `system-design-mobile-client` for client/SDK concerns, and `common-architecture-diagramming` only for a selected view.
2. **Classify independently.** State mode (new design | review existing | interview practice), depth (quick | full), and surface (backend | mobile/client | SDK/library | full stack; mixed may name multiple). Quick uses labeled assumptions; full confirms consequential gates. Escalate quick for hard constraints or irreversible choices. Interview practice follows `system-design-interview-coaching`; the candidate designs, then receives the practice loop and six-criterion debrief.
3. **Intake and estimate.** Follow `system-design-methodology/references/four-phase-process.md` exit predicates. Bound intake to journeys, scope, inputs/outputs, trust/ownership boundaries, quality scenarios (trigger, environment, response, measure, owner), and assumptions. Ask at most 3 blocking questions per turn. Estimate only decision-relevant quantities; label target/estimated/measured and provenance. Confirm material scope and shaping estimates before physical choices in full sessions.
4. **Trace before binding.** Describe each consequential journey logically: source/sink, payload/purpose, transformations, authoritative owner/derived copies, invariant, user-visible outcomes, verification. Use `system-design-data-architecture/references/flow-contracts.md`; do not duplicate C1. Bind accepted decisions to physical components/stores/contracts afterward. Link applicable `FLOW-*` design records through `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*`; `FLOW-*` is not an outcome field.
5. **Select views and deep dives conditionally.** Choose zero or more from the named question, risk, surface, and time. Dataflow explains movement/authority; sequence ordering/acknowledgment; state lifecycle; ERD relationships; deployment placement. Prose/table is sufficient. No component, queue, store, specialist, or diagram quota. Practice uses commitment -> adverse timeline -> mechanism revision -> changed constraint -> evidence-based debrief.
6. **Hold material decisions.** Full sessions do not commit affected design or claim readiness while a material owner/invariant, compliance/residency, or topology-changing budget decision remains unresolved. Record it in `decision_needed`; preserve other gaps in `missing_evidence`. Quick sketches may proceed with explicit assumptions, never false readiness.
7. **Score and hand off.** Run the declared-profile, scope-aware nine-axis `system-design-review` scorecard and independent `system-design-review/references/semantic-evaluation.md`. Use applicable denominators and justified `N/A`. Semantic soundness requires >=85%, no applicable zero, and no hard failure; any failed material gate blocks readiness regardless of aggregate. The six-criterion interview rubric is separate. Preserve existing outcome fields/statuses; design evidence does not prove implementation or operations.
8. **Prepare warranted delivery slices.** Only when independent post-decision docs/diagram slices are warranted, define exact files, AC, evidence, checks, and integrator before execution. Use configured project/account/data-eligible routing; lead retains decisions/final review. Allow one focused correction, then configured eligible fallback or `BLOCKED`. Disclose executor/model/settings, correction/fallback, and actual usage/cost or `unavailable`. This gate grants no model/provider execution authorization, including premium execution; workers must not change policy/profile settings, invoke unapproved model execution, or claim unrun checks.

## Runtime Contract

- Required input: product goal or existing system, plus scale parameters or explicit permission to use labeled assumptions.
- Never select physical components before relevant requirements/estimates exist or are explicitly assumed. Do not claim readiness with unresolved material gates or failed semantic evaluation.
- Return `BLOCKED` for unresolved material ownership, invariant, compliance/residency, or topology-changing budget decisions that prevent a safe design commitment.

## Handoff Payload

Include `slug`, `operator_profile`, design document path, mode/depth/surface, requirement and `FLOW-*` trace, relevant estimates/provenance, assumptions, physical component/ownership decisions, selected view paths, ADRs, scorecard and independent semantic findings, risk register, next workflow, `completed_evidence`, `missing_evidence`, and `decision_needed`.

## Blocking Questions

Ask at most 3 at a time; provide a recommended default and 2–3 options. Quick sketches may proceed with labeled assumptions.

## Output Template

```md
# System Design: [Name]
## Mode, Depth, And Surface
## Requirements, Quality Scenarios, And Scope
## Assumptions And Evidence Provenance
## Decision-Relevant Estimates
## Logical Critical Flows (`FLOW-*`)
## Physical HLD / Ownership / Contracts
## Selected Views And Deep Dives (if any)
## Adverse Timeline, Recovery, And Verification
## Trade-offs, ADRs, And Staged Plan
## Nine-Axis Design Scorecard And Independent Semantic Review
## Interview Scorecard (interview practice only)
## Risks, Missing Evidence, And Decisions Needed

Quick assumptions or unresolved material gates cannot be reported as design-ready. `completed_evidence` records exercised evidence only; planned checks belong in `missing_evidence` until run.

## Outcome Report
schema_version: 1
run_id: "[run-id]"
slug: "[slug]"
workflow: system-design-session
feature_status: "[not_started | requirements_ready | design_ready | partially_implemented | implemented | blocked]"
started_at: "[timestamp]"
completed_at: "[timestamp]"
requirement_trace: { brd_objectives: [], requirements: [], acceptance_criteria: [], srs: [] }
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: design-solution
cost: { source: unavailable }
agent: { identity: "[agent-identity]", model: "[model]" }
```

## Next Workflow

`design-solution` when the design is ready for contract work; otherwise resolve `decision_needed` or missing design evidence first.

## Cost Report

Call `get_session_cost(workflow="system-design-session")` before final handoff. Report actual usage/cost when available; otherwise `unavailable`.
