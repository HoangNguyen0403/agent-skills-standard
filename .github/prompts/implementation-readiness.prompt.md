---
description: "Verify PRD, ACs, architecture, UX, test strategy, and integration prerequisites before implementation starts."
---

# Implementation Readiness Workflow

Goal: Decide whether a planned change is ready for implementation or must return to planning/design.

## Steps

1. Load artifacts:
   - Product brief, PRD/story, architecture notes, UX/design links, implementation plan, test plan.
   - Jira/ADO/Figma/Confluence MCP context when configured; otherwise use exported docs or local files.

2. Check readiness:
   - Business goal and user impact clear.
   - ACs atomic, testable, scoped by platform/market/role where relevant.
   - Architecture/contracts identify touched modules, data/API changes, migrations, and rollout risks.
   - UX/design states cover loading, empty, error, permission, and responsive/mobile cases when UI changes.
   - Test strategy maps ACs to unit, integration, E2E/mobile, security, and Zephyr/manual coverage.
   - Tool prerequisites known: credentials, environments, feature flags, test data, MCP availability.

3. Decide:
   - READY: implementation can start.
   - BLOCKED: missing artifact, unclear AC, missing design/architecture, unavailable environment, or unresolved risk.
   - PARTIAL: implementation may start only for named slices with blocked slices isolated.

4. Route:
   - READY -> `implement-feature` or `dev-fix`.
   - BLOCKED -> `plan-feature`, `design-solution`, or `traceability-audit`.
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

## Next Workflow
```
