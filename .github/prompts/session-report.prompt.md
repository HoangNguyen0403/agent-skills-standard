---
description: "Capture delivery evidence, commands, changed files, blockers, and standards feedback after a work session."
---

# Session Report Workflow

Goal: Preserve a concise artifact of what changed, how it was verified, and what should improve.

## Steps

1. Collect session facts:
   - User goal, ticket/PR/spec links, changed files, commands run, test results, screenshots/logs, environments.
   - MCP/tool calls used when available; otherwise local command summaries and artifact paths.
   - Load `common-operator-profile`; carry the inherited `operator_profile` from the Handoff Payload without re-inferring it.
2. Capture evidence:
   - Implementation summary tied to ACs or tasks.
   - Verification commands and PASS/FAIL/BLOCKED status.
   - Remaining risks, assumptions, and follow-up owners.
3. Record requirements drift:
   - BRD-lite, PRD, and SRS/FRS updates completed or missing.
   - Traceability gaps found during implementation or verification.
4. Route:
   - Remaining code work -> `implement-feature` or `dev-fix`.
   - Missing evidence -> `verify-work` or `traceability-audit`.
   - Standards update -> `retro-learn`.
   - Release communication -> `publish-notes`.

## Runtime Contract
- Use at the end of a work session to preserve evidence and follow-ups before context is lost.
- Required inputs: session goal plus changed files or commands run during the session.
- Return BLOCKED only when no session evidence (changes, commands, or verification) exists to report.
## Handoff Payload
- `slug`, `operator_profile`, goal, changes, verification results, requirement-drift status, risks, follow-ups, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Session Report

## Goal

## Changes

## Verification

| Command/Check | Result | Evidence |
| --- | --- | --- |
| [check] | [result] | [evidence] |

## BRD/PRD/SRS Update Status

## Risks And Follow-Ups

## Skill Feedback Candidates

## Outcome Report
feature_status: partially_implemented | implemented | blocked
requirement_trace: BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> evidence
completed_evidence: []; missing_evidence: []; decision_needed: []; recommended_next_workflow: implement-feature | verify-work | publish-notes | retro-learn

## Next Workflow

## Cost Report
Call `get_session_cost(workflow="session-report")` before final handoff.
```
