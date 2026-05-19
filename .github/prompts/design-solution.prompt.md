---
description: "Turn an approved PRD or implementation goal into architecture, contracts, and verification decisions."
---

# Design Solution Workflow

Goal: Produce a build-ready technical design with explicit boundaries, contracts, risks, and tests.

## Steps

1. Load inputs:
   - PRD or ticket
   - Existing implementation plan if present
   - Relevant `AGENTS.md` and matched framework skills
   - Existing code patterns and architecture docs
2. Define architecture:
   - Name bounded contexts and module owners.
   - Define dependency direction.
   - Choose sync, async, or hybrid communication.
   - Record data ownership and migration needs.
3. Define contracts:
   - API inputs/outputs
   - Events/jobs
   - Storage shape
   - Error states
   - Security and permission checks
4. Plan verification:
   - Unit, integration, E2E, visual, mobile, security, and migration checks.
   - Save architecture notes to `docs/specs/architecture-[slug].md` when file writes are allowed.
   - Record evidence in `docs/templates/walkthrough.md`.
   - Rollback or degradation path.
5. Record ADR:
   - Write one concise ADR when architecture or public contract changes.
   - Route next step to `implement-feature` or `dev-fix`.

## Output

## Output Template

```md
# Technical Design: [Name]

## Context

## Architecture

## Contracts

## Data And Migration

## Security And Privacy

## Failure Modes

## Verification Plan

## ADR

## Next Workflow

implement-feature | dev-fix

## Cost Report
```
