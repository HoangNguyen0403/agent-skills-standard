---
description: "Map requirement, acceptance criteria, implementation, tests, PR evidence, and release artifacts into one traceability report."
---

# Traceability Audit Workflow

Goal: Prove every acceptance criterion has implementation and verification evidence before release or handoff.

## Steps

1. Load sources:
   - PRD/story/Jira, AC list, implementation plan, changed files, tests, walkthrough, PR comments, release notes.
   - Jira/ADO/Zephyr/Confluence MCPs when configured; otherwise use exported files and local evidence.

2. Build trace map:
   - Requirement/story -> AC.
   - AC -> implementation file/function.
   - AC -> automated test, manual/Zephyr TC, or verification step.
   - Finding/comment -> fix commit or remaining risk.
   - Release note -> shipped user-visible change.

3. Classify each AC:
   - Covered: code and test/verification evidence exists.
   - Partial: code or evidence incomplete.
   - Missing: no implementation or no verification.
   - Out of scope: explicitly deferred or non-goal with owner/link.

4. Flag gaps:
   - Missing AC implementation.
   - Missing test/Zephyr/manual coverage.
   - PR evidence not linked.
   - Release note missing user-visible change.
   - Tool unavailable and no local export provided.

## Output Template

```md
# Traceability Audit

## Summary

## AC Trace Map
| AC | Implementation | Verification | Status |
| --- | --- | --- | --- |
| [AC] | [file/function] | [test/TC/evidence] | [status] |

## Gaps

## Next Workflow
```
