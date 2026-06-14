---
description: Verify BRD-lite, PRD, SRS/FRS, UX, and test prerequisites before implementation starts.
---

# Implementation Readiness Workflow

Goal: Decide whether a planned change is ready for implementation or must return to planning/design.

## Steps

1. Load artifacts:
   - BRD-lite brief, PRD/story, SRS/FRS notes, UX/design links, implementation plan, test plan.
   - Jira/GitHub/GitLab/ADO/Figma/Confluence MCP context when configured; otherwise use exported docs or local files.

2. Check readiness:
   - BRD-lite has business goal, stakeholder, AS-IS to TO-BE, and measurable success metric.
   - ACs atomic, testable, scoped by platform/market/role where relevant.
   - PRD has stable requirement IDs, AC IDs, owner, priority, status, and last-updated note.
   - SRS/FRS identifies touched modules, API/data/interface changes, migrations, permissions, failure modes, and NFR thresholds.
   - Requirement trace is complete: BRD objective -> PRD requirement -> SRS/FRS contract -> test lane.
   - UX/design states cover loading, empty, error, permission, and responsive/mobile cases when UI changes.
   - Test strategy maps ACs to unit, integration, E2E/mobile, security, and Zephyr/manual coverage.
   - Tool prerequisites known: credentials, environments, feature flags, test data, MCP availability.

3. Decide:
   - READY: implementation can start.
   - BLOCKED: missing artifact, unclear AC, missing design/architecture, unavailable environment, or unresolved risk.
   - PARTIAL: implementation may start only for named slices with blocked slices isolated.

4. Route:
   - For autonomous/channel mode, return READY only with named slices, owners, verification lanes, and available environments.
   - READY -> `implement-feature` or `dev-fix`.
   - BLOCKED -> `plan-feature` or `design-solution`.
   - PARTIAL -> slice task list plus blockers.

## Output Template

```md
# Implementation Readiness

## Verdict

## Ready Slices

## Blocking Gaps

| Area | Gap | Owner/Input Needed |
| --- | --- | --- |
| [area] | [gap] | [owner/input] |

## Runtime Contract

## Handoff Payload

## Blocking Questions

## Next Workflow

## Cost Report
Call `get_session_cost(workflow="implementation-readiness")` before final handoff.
```
