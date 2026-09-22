---
name: system-design-session
description: "Run an interactive system design session that turns a product goal into a sized, justified architecture with diagrams, ADRs, a scorecard, and a machine-readable handoff."
metadata:
  triggers:
    keywords:
    - system design session
    - workflow
---
# System Design Session Skill

> [!IMPORTANT]
> Run an interactive system design session that turns a product goal into a sized, justified architecture with diagrams, ADRs, a scorecard, and a machine-readable handoff.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# System Design Workflow (Architecture / How Big)

Goal: Produce a capacity-justified architecture baseline that `design-solution` can turn into contracts.

## Steps

1. Load inputs:
   - Load `system-design-methodology` plus matched siblings (estimation, building-blocks, data-architecture, resilience-ops, review, principles) and `common-architecture-diagramming` for the draw.io render pipeline.
   - Load PRD or ticket, existing architecture docs, and current traffic/incident data when reviewing an existing system.
2. Classify and announce:
   - Mode: new design | review existing | interview practice.
   - Interview practice: load `system-design-interview-coaching`, run the seven phases on its time budget as the interviewer, score with its rubric after; steps 3-6 below are the candidate's work, not the agent's.
   - Depth: quick sketch (defaults assumed, each labeled `ASSUMED`) or full session (every gate confirmed).
   - Escalate quick to full when an irreversible or cross-team choice appears.
3. Intake (gate):
   - Ask max 3 blocking questions per turn from the intake checklist; supply a recommended default for each.
   - Record functional requirements, NFR targets, out-of-scope fence, operating team, and every `ASSUMED` value.
   - Review-existing mode: map current state, measure real traffic and incidents, and name the binding constraint before proposing change.
4. Estimate (gate):
   - Compute average and peak QPS, storage over retention, bandwidth, working-set memory, and monthly cost at that scale.
   - Name the shaping quantity and confirm the order of magnitude before any component is drawn.
5. Design incrementally:
   - Price the null option first (do nothing, buy, or extend an existing service); rejecting it needs a stated reason.
   - Start from client, API, service, store; add one component at a time as `constraint -> component -> cost`.
   - Fix API surface, data ownership, and consistency class per flow.
   - Route the result as HLD first: record audience, scope, shaping constraint, ownership, failure domain, lifecycle status, and the decision to review. HLD may be prose or a selected context/container view; do not require every diagram.
   - For each chosen deep dive, create an LLD handoff (`REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*`) covering the component contract, invariant, ordering/idempotency, failure/recovery, and verification. “Low-level design” is the same lane as LLD.
   - Render only selected views through `common-architecture-diagramming` when they answer named questions: use context/container, sequence, dataflow, deployment, or state as appropriate; prose or a table is sufficient otherwise. Carry `metric` and `constraint` only when stated, and leave them absent rather than inventing numbers. No doc yet (quick sketch, or writes disallowed): leave `evidence` absent and let the node render UNVERIFIED. Output only the selected `docs/architecture/[slug]-<type>.drawio` artifacts plus exported images. Phase map: `system-design-methodology/references/phase-deliverables.md`.
6. Deep dive and decide:
   - Dispatch the 2-3 riskiest components to `specialist-system-architect`, one brief each with profile, audience/question, workload, SLO, team/budget, invariant, scope, evidence status, and HLD decision.
   - Require options with rejection reasons, an LLD contract, concrete adverse timeline/recovery, verification hooks, and an ADR reversal trigger. The specialist must not re-run intake or add machinery without a constraint.
   - Merge the returned options, failure modes, and irreversible decisions; state bottlenecks, SPOFs, and rejected alternatives with reasons.
   - Write one ADR per irreversible decision, each with its reversal trigger; stage the plan as build now, enabling seam, and the metric threshold that triggers the next step.
   - Save the design to `docs/design/system-design-[slug].md` when file writes are allowed.
7. Score and hand off:
   - Run the nine-axis scorecard with a declared system profile; permit a justified `N/A` axis and do not reward caches/queues/replicas/regions without a measured need, owner, cost, and recovery behavior.
   - Run independent semantic review in `system-design-review/references/semantic-evaluation.md`; lexical checks remain smoke signals.
   - Emit the HLD/LLD trace and handoff payload; route to `design-solution`.

## Runtime Contract

- Use when architecture, scale, or store selection is unsettled and the design would otherwise be guessed.
- Required inputs: a product goal or existing system, plus scale parameters or explicit permission to assume defaults.
- Never emit a component set before capacity numbers exist or assumptions are labeled.
- Return BLOCKED for undecided cross-team ownership, compliance/residency constraints, or a budget ceiling that changes the topology.

## Handoff Payload

- `slug`, `operator_profile`, design doc path, mode and depth, requirement table, capacity numbers, component list with justifications, data ownership map, NFR thresholds, diagram paths (.drawio + image), ADR list, scorecard, risk register, next workflow.

## Blocking Questions

- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# System Design: [Name]
## Mode And Depth
## Requirements (Functional / NFR / Out Of Scope)
## Assumptions
## Capacity Estimation (incl. monthly cost)
## Null Option Considered
## Component Architecture (constraint -> component -> cost)
## Selected Views (optional; prose or tables allowed)
## Data Ownership And Consistency
## Deep Dives
## Trade-offs And Rejected Alternatives
## Staged Plan (Now / Seam / Trigger)
## ADRs (with reversal triggers)
## Design Scorecard (9 axes)
## Interview Scorecard (6 × 0-3, interview mode only)
## Risk Register

## Outcome Report
feature_status: design_ready | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-*
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: design-solution

## Next Workflow
design-solution | plan-feature
## Cost Report
Call `get_session_cost(workflow="system-design-session")` before final handoff.
```

