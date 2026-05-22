---
description: Map requirements, acceptance criteria, implementation, tests, and release artifacts into one traceability report.
---

# Traceability Audit Workflow

Goal: Prove every acceptance criterion has implementation and verification evidence before release or handoff.

## Steps

1. Load sources:
   - BRD-lite, PRD, SRS/FRS, AC list, implementation plan, changed files, tests, walkthrough, PR comments, release notes.
   - Jira/GitHub/GitLab/ADO/Zephyr/Confluence MCPs when configured; otherwise use exported files and local evidence.
2. Build trace map:
   - BRD objective -> PRD requirement ID.
   - PRD requirement ID -> SRS/FRS contract.
   - AC -> implementation file/function.
   - AC -> automated test, manual/Zephyr TC, or verification step.
   - Release note -> shipped user-visible change.
3. Classify each AC:
   - Covered: code and verification evidence exists.
   - Partial: code or evidence incomplete.
   - Missing: no implementation or no verification.
   - Out of scope: explicitly deferred with owner/link.
4. Flag gaps:
   - Missing requirement mapping.
   - Missing AC implementation.
   - Missing test or manual coverage.
   - Release note missing shipped user impact.

## Output Template

```md
# Traceability Audit

## Summary

## Requirement Map

| Requirement | SRS/FRS Contract | Verification | Status |
| --- | --- | --- | --- |
| [REQ] | [contract] | [test/evidence] | [status] |

## Gaps

## Next Workflow

## Cost Report
```
