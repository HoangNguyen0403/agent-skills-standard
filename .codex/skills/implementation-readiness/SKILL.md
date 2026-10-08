---
name: implementation-readiness
description: "Verify BRD-lite, PRD, SRS/FRS, UX, and test prerequisites before implementation starts."
metadata:
  internal: true
  triggers:
    keywords:
    - implementation readiness
    - workflow
---
# Implementation Readiness Skill

> [!IMPORTANT]
> Verify BRD-lite, PRD, SRS/FRS, UX, and test prerequisites before implementation starts.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Implementation Readiness Workflow

Goal: Decide whether a planned change is ready for implementation or must return to planning/design.

## Steps

1. Load artifacts:
   - Load the task-linked approved brief/ticket, PRD/story or equivalent approved evidence, SRS/FRS when needed, UX/design evidence when relevant, implementation plan and test plan.
   - Do not require a separate filename when an approved task record supplies the necessary information. A matching record and stable slug are required; unrelated documents and working-tree changes are not authority or approval.

2. Check readiness:
   - Approved task record supplies an outcome, constraints/non-goals, testable acceptance criteria, owner and approval; equivalent evidence is acceptable without a separate BRD/PRD/SRS file. `approval: approved` passes; `pending` blocks; `assumed-autonomous` warns and blocks only when `snc_tier=high`.
   - ACs are atomic, testable, and scoped by platform/market/role where relevant.
   - Available requirement/design evidence identifies affected modules and consequential API/data/interface/migration/permission/failure/NFR choices; unresolved sensitive or consequential choices route to technical design and human approval as applicable.
   - Requirement trace links available business/product requirements to technical contracts and test lanes; do not invent a mandatory document-writing detour when approved evidence already establishes the needed contract.
   - UX/design evidence covers loading, empty, error, permission, and responsive/mobile cases when UI changes.
   - Test strategy maps ACs to available unit, integration, E2E/mobile, security, and Zephyr/manual lanes; record unavailable optional lanes as blockers on only the affected slices.
   - Tool prerequisites known: credentials, environments, feature flags, test data, MCP availability.

3. Decide:
   - READY: approved evidence, owner, ACs, required design/approval and test prerequisites permit the named slice(s) to start.
   - BLOCKED: required authority/approval, owner, unclear AC, consequential design, environment, or risk remains unresolved; do not recommend unconditional implementation.
   - PARTIAL: name each independently bounded ready slice with owner, approval and verification lane; name each blocked slice with its owner, dependency/input and reason. Only ready slices may flow downstream.
4. Route:
   - For autonomous/channel mode, return READY only with named slices, owners, verification lanes, approval and available required environments.
   - READY -> `implement-feature` or `dev-fix`.
   - BLOCKED -> `plan-feature` or `design-solution`; do not emit an unconditional implementation recommendation.
   - PARTIAL -> send only explicitly ready slices downstream with their blockers and owners; downstream execution cannot absorb blocked slices or claim their activation.
   - Write the run record to `artifacts/runs/[slug]/[compactISO]-implementation-readiness.json` when file writes are allowed.

## Runtime Contract
- Use before implementation starts to gate go/no-go.
- Required inputs: a matching approved task record/ticket or equivalent evidence, owner, testable ACs and the design/test prerequisites applicable to each proposed slice. Separate BRD/PRD/SRS filenames are not required when the task record carries equivalent information.
## Handoff Payload
- `slug`, verdict (READY/BLOCKED/PARTIAL), ready slices, blocking gaps, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Implementation Readiness

## Verdict

## Ready Slices

## Blocking Gaps

| Area | Gap | Owner/Input Needed |
| --- | --- | --- |
| [area] | [gap] | [owner/input] |

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: implementation-readiness, feature_status: design_ready, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: implement-feature, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

## Cost Report
Call `get_session_cost(workflow="implementation-readiness")` before final handoff.
```

