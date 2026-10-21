---
name: system-design-methodology
description: "Facilitate system design by classifying mode, depth, and surface independently; scoping journeys; estimating only decision-relevant quantities; tracing logical flows before physical binding; and selecting risk-driven views and deep dives. Use for system design sessions and reviews."
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

Classify work mode, depth, and system surface independently. Load only the relevant skill siblings: data-architecture for consequential data/state flows, mobile-client for mobile/client or SDK/library concerns, and diagramming only when a view is selected. Backend, mobile/client, SDK/library, and full-stack are surfaces; none is a mode.

## Phase 0 - Classify

- State mode (new design | review existing | interview practice), depth (quick | full), and surface (backend | mobile/client | SDK/library | full stack). A mixed system may name multiple surfaces.
- Quick sketches use explicit assumptions and skip confirmation gates; full sessions follow the per-phase exit predicates in the [four-phase process](references/four-phase-process.md) and confirm consequential decisions. Escalate quick to full for hard constraints or irreversible choices; an unresolved material decision prevents a readiness claim.
- Interview practice follows [interview coaching](../system-design-interview-coaching/SKILL.md); production review/design follows this process.

## Phase 1 - Intake

- Bound questions to what changes the design. Identify journeys, inputs/outputs, actors, trust and ownership boundaries, team/budget, and scope.
- For each consequential journey, state a quality scenario: trigger, environment, response, measurable condition, and owner. Ask at most 3 blocking questions per turn; label usable defaults as `ASSUMED`.
- Review-existing mode maps current components, owners, traffic, incidents, and binding constraint before proposing change. SDK scope includes host responsibilities and compatibility; client scope includes authority, lifecycle, and offline need.
- See [intake checklist](references/intake-checklist.md); do not require every backend intake field for every surface.

## Phase 2 - Estimation

- Estimate only quantities that shape the chosen surface and decisions. For backend/data paths, derive rates, payload/bandwidth, retention/storage, fan-out, backlog or working set as applicable. For client/device work, estimate relevant memory, disk, network, battery-sensitive work, and queue bounds. For SDKs, bound calls, concurrency, buffers, and lifecycle when material; do not force backend QPS.
- Label quantities target, estimated, or measured; state provenance and assumptions. Name the shaping quantity. Do not fabricate values or compute irrelevant metrics to fill a template.

## Phase 3 - Logical Design and Physical Binding

- Before choosing components or transport, trace consequential journeys logically: source/sink, payload/purpose, transformations, authority/copies, invariant, user-visible outcomes, and observable verification. Use the canonical [critical-flow contract](../system-design-data-architecture/references/flow-contracts.md), adding conditional fields only when material.
- Price the null option where a build/buy/extend decision exists. Start from the smallest design satisfying requirements; add a component only for a named constraint and state its cost.
- Bind accepted decisions to physical owners, stores, and contracts afterward. Link applicable `FLOW-*` design records to `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*`; `FLOW-*` is not an outcome-schema field. Keep unresolved assumptions and owner/invariant gaps visible.
- Select a view only for a named question: dataflow for movement/transformation/authority, sequence for ordering/acknowledgment, state for lifecycle, ERD for relationships, deployment for placement. Prose or a table is enough when it resolves the decision. Do not infer runtime properties from a DFD.
- Diagram JSON is the semantic source of truth; draw.io is editable presentation and the image is an exported copy. Follow [phase deliverables](references/phase-deliverables.md).

## Phase 4 - Risk, Learning, and Handoff

- Select zero or more deep dives/views from unresolved consequential risks, surface, and available time; no component, specialist, or diagram quota. Each dive resolves a named decision and covers adverse timeline, invariant, mechanism/recovery, verification, and reversal trigger where applicable.
- In practice, use initial design -> concrete adverse timeline -> revise affected mechanism -> change a constraint -> evidence-based debrief. Grade reasoning and adaptation, not technology counts.
- Readiness requires a declared-profile, scope-aware nine-axis design scorecard ([system-design-review](../system-design-review/SKILL.md), applicable axes only, justified `N/A` excluded from its denominator) and an independent semantic evaluation ([canonical evaluator](../system-design-review/references/semantic-evaluation.md)); the interview's six-criterion rubric is separate.
- Semantic soundness requires at least 85%, no applicable dimension at 0, and no hard failure. Any failed material gate blocks readiness regardless of aggregate score. Justify `N/A` by scope; preserve existing outcome values and report unresolved evidence/decisions in existing fields. Do not claim implementation/operations readiness from a design score.
- Stage now/seam/trigger only after recording scorecard findings and semantic gaps.

## Delivery

- HLD gives boundaries and decisions; LLD gives one component/flow's contract and behavior. Flow records link to the existing trace without expanding machine-readable fields.
- Keep requirements, estimates, assumptions, missing evidence, ownership, and verification connected. A document or planned check is not runtime/deployment evidence.

## Design-to-Delivery Boundary

- When independent post-decision document/diagram slices are warranted, define exact files, acceptance criteria, evidence sources, verification checks, and integrator before execution. Use only the configured route eligible for the project/account/data; the lead retains decisions and final review.
- For a defective slice, allow one focused correction, then use the configured eligible fallback or report `BLOCKED`. Record executor/model/settings, corrections, fallback reason, and actual usage/cost or `unavailable`. This gate hard-codes no model/provider and grants no premium authorization.


## Anti-Patterns

- **No architecture before requirements**: no component set before relevant quantities exist or assumptions are labeled.
- **No universal infrastructure**: a stateless computation or SDK may need no store, queue, or database.
- **No silent assumptions or quota**: do not invent numbers, diagram types, components, or deep dives to complete a template.

