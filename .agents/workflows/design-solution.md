---
description: Turn an approved PRD or implementation goal into SRS/FRS technical requirements (How), architecture, contracts, and verification decisions.
---

# Design Solution Workflow (SRS/FRS / How)

Goal: Produce a build-ready technical design with explicit boundaries, contracts, risks, and tests.

## Steps

1. Load inputs:
   - Load baseline SRS/FRS section, `common-software-requirements`, PRD or ticket, implementation plan, matched framework skills, architecture docs, and trace source `BRD-OBJ-* -> REQ-* -> AC-*`.
2. Define architecture:
   - Name bounded contexts and module owners.
   - Define dependency direction and component RACI.
   - Choose sync, async, or hybrid communication.
   - Record data ownership and migration needs.
   - Define early mock/schema contracts so frontend, mobile, and backend can start in parallel.
3. Define contracts:
   - Functional flows (FRS): user/system steps, inputs/outputs, validations, and error states.
   - For complex flows, use one actor, one goal, one session; split normal course from alternatives and exceptions.
   - Requirement cards: statement, priority, status, source, behavior, NFRs, measurement, and verification lane.
   - API inputs/outputs and interface contracts (OpenAPI/Protobuf).
   - Events/jobs and async guarantees (at-least-once, idempotent).
   - Storage shape, ownership, retention, and migration rules.
   - Security, permission, and privacy checks.
   - NFR thresholds for performance, reliability, and scalability.
4. Plan verification:
   - Unit, integration, E2E, visual, mobile, security, and migration checks.
   - Failure mode analysis for dependencies, fallbacks, retries, and rollback/degradation.
   - Save technical requirements to `docs/srs/srs-[slug].md` when file writes are allowed.
   - Record evidence in `docs/srs/srs-walkthrough.md`.
5. Record ADR:
   - Write one concise ADR when architecture or public contract changes.
   - Continue when patterns are inferable; return BLOCKED for cross-team contracts, migrations, permissions, or NFR uncertainty.
   - Route next step to `implement-feature` or `dev-fix`.

## Runtime Contract

- Use after PRD or when implementation is approved but architecture and contracts are not explicit.
- Required inputs: PRD or ticket plus enough context to define contracts and verification.
- Return BLOCKED only for cross-team contracts, migrations, permissions, or NFR uncertainty.

## Handoff Payload

- `slug`, SRS path, requirement trace, architecture decisions, contracts, data/migration plan, NFR thresholds, verification matrix, ADR, next workflow.

## Blocking Questions

- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Technical Design (SRS/FRS): [Name]
## Context
## Requirement Trace (BRD -> PRD -> SRS)
## Architecture & RACI
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

## Next Workflow
implement-feature | dev-fix
## Cost Report
Call `get_session_cost(workflow="design-solution")` before final handoff.
```
