---
description: Plan a feature from BRD-lite brief or clear intent into PRD (What), decisions, implementation plan, and task slices.
---

# Feature Planning Workflow (PRD / What)

Goal: Produce a PM-owned decision-complete PRD, delivery plan, and IT Department handoff before code starts.

## Steps
1. Load context:
   - Load baseline PRD section, task-linked evidence, and canonical ledger (`docs/product/<slug>/evidence.json`) with stable slug; when intent is unclear, ask which matching ticket/brief is authoritative rather than selecting an unrelated recent document; link strategy, OPP, DEC, critical assumption, and MET refs without duplicating records or minting product IDs as requirement IDs.
   - Explicitly load `product-management/product-requirements` and its on-demand `references/requirements-modeling.md`; report truthfully if unavailable.
   - Load `product-management/product-business-requirements` when BRD-lite context applies; also load ticket text, existing specs, repo patterns, `common-operator-profile`, `common-decision-discipline`, `quality-engineering-business-analysis`, and matched framework skills.
   - Carry forward `operator_profile`, `lane`, `snc_tier`, `approval`, BRD objective IDs, SMART metric, scope fence, assumptions, evidence ledger, glossary, risks, delivery context. Equivalent approved evidence suffices without separate BRD/PRD/SRS filenames; reused approved context skips rediscovery.
2. Interview:
   - Draft provisional PRD direction from current context before asking; ask only for business logic, scope, constraints, and acceptance criteria that cannot be inferred.
   - Ask max 3 blocking decisions at a time with recommended default and 2-3 options; treat non-critical unknowns as explicit assumptions.
   - Confirm problem statement, assumptions, target users, JTBD/use cases, platforms, data, analytics, security, performance, rollout, and non-goals.
   - Confirm each requirement has owner, priority, and status; confirm success metrics and guardrails that must not regress.
   - Carry legitimate no-build, defer, buy, substitute options, negative evidence, and permission boundaries; brief approval alone confers NO budget, exposure, pilot, or rollout consent.
   - Stop when requirements are actionable.
3. Draft PRD:
   - Save to `docs/prd/prd-[slug].md` when file writes are allowed.
   - Keep "what" separate from "how"; consequential architecture/contracts route to `design-solution`.
   - Add stable `REQ-*` and `AC-*` IDs; link each requirement back to BRD-lite objective. One observable behavior per AC with necessary preconditions; truth tables for interacting conditions.
   - For substantial scope, build capability inventory (verb-object, in-scope/deferred/excluded); one containment parent per node, shared rules referenced without duplicate definitions.
   - Use Given/When/Then AC when behavior can be misread; check user stories for persona, value, INVEST, happy/edge/negative paths.
   - Select views by question (process flow=order, decision table=rules, state=lifecycle) per `requirements-modeling.md`; prose/tables allowed, no mandatory UML.
   - Include risk categories, rollout/ops, decision log, analytics/telemetry, changelog. Mark unresolved blocking product decisions as blockers (name slice, consequence, owner, input).
   - Include RACI table for BA, PM, architect, backend, frontend, mobile, QA, release, and business/UAT approver when more than one delivery role is involved.
4. Create implementation plan:
   - Define product outcomes, ACs, dependencies, delivery risks, and provisional owner-aligned slices.
   - Keep unresolved architecture/contracts explicit for `design-solution`; do not author technical design twice in PM plan.
   - Map each provisional task slice to requirement IDs, AC IDs, likely owner role, repo/module, expected artifact, and verification lane.
   - Estimate each slice (t-shirt size + confidence); roll up a delivery-window range in time/cost terms for `operator_profile=business`, points otherwise. Identify whether `design-solution` is required before coding.
5. Route:
   - Continue when assumptions are non-critical; return BLOCKED for missing owner, untestable AC, approval, or release constraint.
   - Empirical hypothesis testing needed -> `validate-product` (when selected/installed; else record capability gap, keep hypothesis as unvalidated assumption, and route to `implementation-readiness`); architecture/contracts unclear -> `design-solution`; approved plan with trace and testable ACs -> `implementation-readiness`.
## Runtime Contract
- Use after BRD-lite or when clear feature intent exists but PRD does not. Brief approval does not grant deployment, spend, or runtime exposure authority.
- Required inputs: BRD-lite or equivalent intent, plus enough context to name users, goals, and constraints.
- Return BLOCKED only for missing owner, untestable AC, approval, or release constraint.
## Handoff Payload
- `slug`, `operator_profile`, `lane`, `snc_tier`, `approval`, PRD path, `REQ-*`, `AC-*`, decisions, RACI, rollout notes, task slices, delivery-window estimate, verification plan, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.
## Output Template
```md
# Feature Plan: [Name]
## PRD
## Problem Statement
## Goals And Guardrails
## Personas / JTBD
## Use Cases
## Requirement Trace
## User Stories And ACs
## Decisions
| Decision   | Choice   | Reason   |
| ---------- | -------- | -------- |
| [decision] | [choice] | [reason] |
## RACI / IT Department Handoff
## Analytics / Telemetry
## Risks And Assumptions
## Rollout / Ops
## Implementation Plan
## Task Slices And Delivery Estimate
## Verification Plan
## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: plan-feature, feature_status: requirements_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: design-solution, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
design-solution | implementation-readiness
## Cost Report
Call `get_session_cost(workflow="plan-feature")` before final handoff.
```
