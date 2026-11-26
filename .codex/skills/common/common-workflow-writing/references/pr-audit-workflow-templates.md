# Workflow Artifact Templates

Illustrative artifact shapes extracted so workflow bodies stay within their line budget. Nothing here is an observed result: fill every field, status, and successor from the run's own evidence. Loaded on demand from `dev-fix` and `verify-bug`.

## Implementation Plan (`dev-fix`, `extended`)

```md
# Implementation Plan: [Name]

## Goal

## Proposed Changes

## Task Slices

| Slice   | Scope   | Verification   |
| ------- | ------- | -------------- |
| [slice] | [scope] | [verification] |

## Risks

## Verification Plan

## Next Workflow
Candidates: implementation-readiness | design-solution | null, chosen from the settled plan evidence.
```

## Task List (`dev-fix`, `extended`)

```md
# Task: [Name]

## Scope

## Checklist

- [ ] [task]

## Decisions

## Evidence

## Next Workflow
Candidates: verify-work | dev-fix | null, chosen from the settled slice evidence.
```

## Walkthrough (`dev-fix` `standard`/`extended`, `verify-bug`)

```md
# Walkthrough: [Name]

## Scope

## Acceptance Criteria

## Evidence

| Check   | Result              | Evidence   |
| ------- | ------------------- | ---------- |
| [check] | [PASS/FAIL/BLOCKED] | [evidence] |

## Risks

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: "[dev-fix | verify-bug]", feature_status: "[evidence-derived status]", started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: "[evidence-selected workflow or null]", cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
Candidates only; the successor named in the run record comes from the reported evidence and the approval actually held.
```
