---
description: Capture delivery evidence, commands, changed files, blockers, and standards feedback after a work session.
---

# Session Report Workflow

Goal: Preserve a concise artifact of what changed, how it was verified, and what should improve.

## Steps

1. Collect session facts:
   - User goal, ticket/PR/spec links, changed files, commands run, test results, screenshots/logs, environments.
   - MCP/tool calls used when available; otherwise local command summaries and artifact paths.
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

## Next Workflow

## Cost Report
```
