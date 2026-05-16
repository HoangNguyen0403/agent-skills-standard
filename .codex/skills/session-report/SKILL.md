---
name: session-report
description: "Capture delivery evidence, commands, changed files, tool usage, token/cost notes, blockers, and skill-feedback candidates after a work session."
metadata:
  triggers:
    keywords:
    - session report
    - workflow
---
# Session Report Skill

> [!IMPORTANT]
> Capture delivery evidence, commands, changed files, tool usage, token/cost notes, blockers, and skill-feedback candidates after a work session.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Session Report Workflow

Goal: Preserve a concise permanent artifact of what changed, how it was verified, and what standards should improve.

## Steps

1. Collect session facts:
   - User goal, ticket/PR/spec links, changed files, commands run, test results, screenshots/logs, deployed environments.
   - MCP/tool calls used when available; otherwise local command summaries and artifact paths.

2. Capture evidence:
   - Implementation summary tied to ACs or tasks.
   - Verification commands and PASS/FAIL/BLOCKED status.
   - Remaining risks, assumptions, and follow-up owners.
   - Token/cost/time notes when available.

3. Identify standards feedback:
   - Missed issue that an active skill should have prevented.
   - New repeatable rule worth adding to a skill.
   - Workflow gap, specialist gap, eval case, or docs gap.

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

## Risks And Follow-Ups

## Skill Feedback Candidates

## Next Workflow
```

