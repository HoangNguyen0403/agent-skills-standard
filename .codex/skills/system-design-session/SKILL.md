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
   - Load `system-design-methodology` plus matched siblings (estimation, building-blocks, data-architecture, resilience-ops, review, principles, diagramming).
   - Load PRD or ticket, existing architecture docs, and current traffic/incident data when reviewing an existing system.
2. Classify and announce:
   - Mode: new design | review existing | interview practice.
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
   - Render diagrams only after the component set is agreed, per `system-design-diagramming`: an `architecture` view plus `sequence` or `dataflow` for the critical path.
6. Deep dive and decide:
   - Dispatch the 2-3 riskiest components to `specialist-system-architect`, one brief each with its numbers and consistency requirement.
   - Merge the returned options, failure modes, and irreversible decisions; state bottlenecks, SPOFs, and rejected alternatives with reasons.
   - Write one ADR per irreversible decision, each with its reversal trigger; stage the plan as build now, enabling seam, and the metric threshold that triggers the next step.
   - Save the design to `docs/design/system-design-[slug].md` when file writes are allowed.
7. Score and hand off:
   - Run the nine-axis scorecard (including cost proportionality), record the risk register, and emit the handoff payload.
   - Route to `design-solution`; return to `plan-feature` when product scope is still undefined.

## Runtime Contract

- Use when architecture, scale, or store selection is unsettled and the design would otherwise be guessed.
- Required inputs: a product goal or existing system, plus scale parameters or explicit permission to assume defaults.
- Never emit a component set before capacity numbers exist or assumptions are labeled.
- Return BLOCKED for undecided cross-team ownership, compliance/residency constraints, or a budget ceiling that changes the topology.

## Handoff Payload

- `slug`, `operator_profile`, design doc path, mode and depth, requirement table, capacity numbers, component list with justifications, data ownership map, NFR thresholds, ADR list, scorecard, risk register, next workflow.

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
## Diagrams (Architecture / Sequence / Data Flow)
## Data Ownership And Consistency
## Deep Dives
## Trade-offs And Rejected Alternatives
## Staged Plan (Now / Seam / Trigger)
## ADRs (with reversal triggers)
## Design Scorecard (9 axes)
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

