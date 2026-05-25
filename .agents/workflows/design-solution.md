---
description: Turn an approved PRD or implementation goal into SRS/FRS technical requirements (How), architecture, contracts, and verification decisions.
---

# Design Solution Workflow (SRS/FRS / How)

Goal: Produce a build-ready technical design with explicit boundaries, contracts, risks, and tests.

## Steps

1. Load inputs:
   - Load baseline: `docs/requirements-standards-baseline.md` (SRS/FRS section).
   - Load `common-software-requirements`.
   - PRD or ticket
   - Existing implementation plan if present
   - Relevant `AGENTS.md` and matched framework skills
   - Existing code patterns and architecture docs
   - Trace source: `BRD-OBJ-* -> REQ-* -> AC-*`
2. Define architecture:
   - Name bounded contexts and module owners.
   - Define dependency direction.
   - Choose sync, async, or hybrid communication.
   - Record data ownership and migration needs.
3. Define contracts:
   - Functional flows (FRS): user/system steps, inputs/outputs, validations, and error states.
   - For complex flows, use one actor, one goal, one session; split normal course from alternatives and exceptions.
   - Requirement cards: statement, priority, status, source, behavior, NFRs, measurement, and verification lane.
   - API inputs/outputs and interface contracts.
   - Events/jobs and async guarantees.
   - Storage shape, ownership, retention, and migration rules.
   - Security, permission, and privacy checks.
   - NFR thresholds for performance, reliability, and scalability.
4. Plan verification:
   - Unit, integration, E2E, visual, mobile, security, and migration checks.
   - Save technical requirements to `docs/specs/srs-[slug].md` when file writes are allowed.
   - Record evidence in `docs/templates/walkthrough.md`.
   - Rollback or degradation path.
5. Record ADR:
   - Write one concise ADR when architecture or public contract changes.
   - Route next step to `implement-feature` or `dev-fix`.

## Output

## Output Template

```md
# Technical Design (SRS/FRS): [Name]

## Context

## Requirement Trace

## Architecture

## Functional Flows (FRS)

## Requirement Cards

## Contracts

## Data And Migration

## NFR Thresholds

## Measurement Methods

## Security And Privacy

## Failure Modes

## Verification Plan

## ADR

## Next Workflow

implement-feature | dev-fix

## Cost Report
```
