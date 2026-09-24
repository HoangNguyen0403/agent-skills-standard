---
name: design-solution
description: "Turn an approved PRD or implementation goal into SRS/FRS technical requirements (How), architecture, contracts, and verification decisions."
metadata:
  triggers:
    keywords:
    - design solution
    - workflow
---
# Design Solution Skill

> [!IMPORTANT]
> Turn an approved PRD or implementation goal into SRS/FRS technical requirements (How), architecture, contracts, and verification decisions.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Design Solution Workflow (SRS/FRS / How)

Goal: Produce a build-ready technical design with explicit boundaries, contracts, risks, and tests.

## Steps

1. Load inputs:
   - Load baseline SRS/FRS section, `common-software-requirements`, PRD or ticket, implementation plan, matched framework skills, architecture docs, and trace source `BRD-OBJ-* -> REQ-* -> AC-*`.
2. Define architecture:
   - Name bounded contexts, module/data owners, and migration needs.
   - Consume or create the HLD trace: requirements, audience, scope, shaping constraints, lifecycle status, ownership, failure domains, and decisions.
   - Define dependency direction, component RACI, and sync, async, or hybrid communication.
   - Define early mock/schema contracts so frontend, mobile, and backend can start in parallel; create LLD contracts only for the components or flows that need them. Select a `container`, `sequence`, or other view only when it answers a named question through `common-architecture-diagramming` (`evidence` cites the SRS or system-design doc, `metric` comes from stated NFR thresholds). A diagram is not mandatory when prose or a table is precise enough; never fabricate a metric.
3. Define contracts:
   - Functional flows (FRS): user/system steps, inputs/outputs, validations, and error states.
   - For complex flows, use one actor, one goal, one session; split normal course from alternatives and exceptions.
   - Requirement cards: statement, priority, status, source, behavior, NFRs, measurement, and verification lane.
   - API inputs/outputs and interface contracts (OpenAPI/Protobuf).
   - Events/jobs and async guarantees (at-least-once, idempotent).
   - Storage shape, ownership, retention, and migration rules.
   - Security, permission, and privacy checks.
   - Carry `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*` IDs into requirement cards and interface contracts. LLD is the low-level-design lane: specify ownership, consistency, ordering/idempotency, adverse timeline, recovery, and verification for each chosen component; do not force every component into a diagram.
   - NFR thresholds for performance, reliability, and scalability.
4. Plan verification:
   - Unit, integration, E2E, visual, mobile, security, and migration checks.
   - Failure mode analysis for dependencies, fallbacks, retries, and rollback/degradation.
   - Save technical requirements to `docs/srs/srs-[slug].md` when file writes are allowed.
   - Record evidence in `docs/srs/srs-walkthrough-[slug].md`.
5. Record ADR:
   - Write one concise ADR when architecture or public contract changes.
   - Continue when patterns are inferable; return BLOCKED for cross-team contracts, migrations, permissions, or NFR uncertainty.
   - Route next step to `implementation-readiness` or `dev-fix`.

## Runtime Contract

- Use after PRD or when implementation is approved but architecture and contracts are not explicit.
- Required inputs: PRD or ticket plus enough context to define contracts and verification.
- Return BLOCKED only for cross-team contracts, migrations, permissions, or NFR uncertainty.

## Handoff Payload

- `slug`, SRS path, requirement trace, architecture decisions, diagram paths, contracts, data/migration plan, NFR thresholds, verification matrix, ADR, outcome report, next workflow.

## Blocking Questions

- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Technical Design (SRS/FRS): [Name]
## Context
## Requirement Trace (BRD -> PRD -> SRS)
## Architecture & RACI
## Selected Views (optional; prose or tables allowed)
## Functional Flows (FRS)
## Parallel Readiness (Mocks/Schemes)
## Requirement Cards
## Contracts (API/Events)
## Data And Migration
## NFR Thresholds & Measurement
## Security And Privacy
## Failure Mode Analysis (FMA)
## Verification Plan & Evidence Matrix
## ADR

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: design-solution, feature_status: design_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: implementation-readiness, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
implementation-readiness | dev-fix
## Cost Report
Call `get_session_cost(workflow="design-solution")` before final handoff.
```

