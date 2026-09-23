---
name: system-design-methodology
description: "Drives an interactive system design session: classifies depth, elicits scale/SLO/consistency inputs, computes capacity, then reveals components one by one, each justified by a constraint. Use when designing a system or running a design session; diagrams go through `common-architecture-diagramming`."
metadata:
  triggers:
    keywords:
      - system design
      - design a system
      - design session
      - high-level design
      - low-level design
      - HLD
      - LLD
      - requirements clarification
      - capacity planning
      - scale this
---

# System Design Methodology

## **Priority: P0 (CRITICAL)**

Requirements before solutions. Never draw a full architecture before numbers justify it.

## Phase 0 - Classify Depth (always first)

- **Quick sketch**: exploratory ask, no scale numbers available, answer needed now. Assume defaults, label each one `ASSUMED`, skip gates.
- **Full session**: real build, migration, or budget commitment. Run every phase gate.
- State depth and mode (new design | review existing | interview practice) in one line, then continue. Interview practice runs through `system-design-interview-coaching`: the round on a clock, the rubric after.
- Escalate quick to full when a hard constraint or irreversible choice appears.

## Phase 1 - Intake (gate)

- Parse request: verbs to use cases, nouns to entities, adjectives to constraints.
- Ask max 3 blocking questions per turn, each with a recommended default. See [intake checklist](references/intake-checklist.md).
- Required before design: DAU/actors, top 3 use cases, read:write ratio, latency SLO, consistency need, retention, peak shape, budget, team size.
- Freeze scope: list what is explicitly out of scope.

## Phase 2 - Estimation (gate)

- Compute QPS, storage, bandwidth, and working-set memory via `system-design-estimation`.
- Present the numbers, name the one quantity that shapes the design, confirm before drawing anything.

## Phase 3 - High-Level Design (incremental)

- Price the null option first: do nothing, buy it, or let an existing service absorb it. Rejecting it needs a stated reason, not silence.
- Start with the smallest system satisfying functional requirements: client, API, service, store.
- Add one component at a time. For each, state `constraint -> component -> cost` in one line. No component without a named constraint.
- Define API surface (one endpoint per functional requirement) and data ownership before optimizing.
- Select views only when they answer a named question, per `common-architecture-diagramming`: a context/container, sequence, dataflow, deployment, or state view may be used when useful; prose or a table is sufficient otherwise. Carry `metric` and `constraint` only when the design states them; never invent a number to populate a node. See [phase deliverables](references/phase-deliverables.md).

## HLD, LLD, and Low-Level Design Routing

- **HLD** answers audience-level boundaries, shaping constraints, ownership, failure domains, and the decision to make. Use context/container or prose only when that is enough; no diagram is mandatory.
- **LLD** (the same lane as “low-level design”) answers one component or critical flow: data/state ownership, API or event contracts, ordering, idempotency, failure behavior, and verification. Use sequence, dataflow, or state only when that view resolves a named question.
- Trace every handoff as `requirement -> HLD decision -> component -> LLD contract -> verification`. Give each link a stable ID and carry unresolved assumptions forward; an LLD must not silently change the HLD invariant.
- Each selected view declares `audience`, `question`, `decision`, `scenario`, `invariant`, `scope`, `status`, `evidence`, and `omissions`. Lifecycle is `proposed|implemented|retired`; `evidence` is a citation, not confidence. Keep `evidence_kind` and `evidence_confidence` separate per the renderer-owned [diagram spec](../../common/common-architecture-diagramming/references/diagram-spec.md) and [view manifest](../../common/common-architecture-diagramming/references/view-manifest.md); never infer deployment from a code/document citation.
- Views are evidence for a question, not a completeness checklist. Prefer a precise paragraph or table over a diagram that adds no decision value.

## Specialist Deep-Dive Contract

- Send one specialist brief per risky component with profile, audience/question, workload/SLO/team/budget, invariant, scope, evidence status, and current HLD decision. The specialist does not re-run intake, add neighboring components, or invent numbers.
- Require options with rejection reasons, the recommended LLD contract, failure timeline/recovery, verification hooks, and any ADR reversal trigger. Merge the result back into the HLD-to-LLD trace before scoring.

## Brownfield Path (review-existing mode)

- Map current state before proposing anything: components, owners, traffic, incidents.
- Measure, do not assume: pull real QPS, data volume, and p99 from the running system.
- Find the binding constraint - the one that fails first at the next growth step.
- Design the smallest change that moves it, then re-measure. A rewrite needs a structural constraint the current shape cannot satisfy.

## Phase 4 - Deep Dives and Trade-offs

- User picks the 2-3 riskiest components; go deep only there.
- Dispatch each deep dive to `specialist-system-architect` with the component name, its numbers, and its consistency requirement; keep the session gates in this thread.
- Close with bottlenecks, SPOFs, rejected alternatives plus rejection reasons, and the next scaling step.
- Stage the result: what to build now, the seam that enables the next step, and the metric threshold that triggers it.
- Record one ADR per irreversible decision, each with its reversal trigger - what would make us revisit this. Score the result with `system-design-review`.

## Anti-Patterns

- **No architecture before requirements**: no diagram until Phase 1 answers exist or defaults are flagged.
- **No unjustified components**: every box names the constraint it solves.
- **No design without the null option**: state why doing nothing or buying loses before building.
- **No silent assumptions**: an unknown input becomes a labeled `ASSUMED` default, never a hidden guess.
- **No full-stack reveal**: never dump a finished diagram before incremental agreement.

## Red Flags

- **Stop if "just give me the architecture"**: deliver a quick sketch with `ASSUMED` labels, not fake precision.
- **Stop if scale is unknown at Phase 3**: return to Phase 2 and estimate from a stated assumption.

## References

- [Four-Phase Process](references/four-phase-process.md) - per-phase gates, outputs, escalation rules
- [Intake Checklist](references/intake-checklist.md) - question bank with defaults
- [Phase Deliverables](references/phase-deliverables.md) - interview phase to artifact and diagram map
- [Interview Coaching](../system-design-interview-coaching/SKILL.md) - timed mock rounds, rubric, mistakes
