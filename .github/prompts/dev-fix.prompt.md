---
description: "Unified developer workflow for fixing bugs. Analyzes issue-tracker context, cross-checks docs/code, proposes a solution, implements the fix, verifies locally, and delivers a PR/MR."
---

# Dev-Fix — Bug Remediation

Goal: Take a bug ticket from root-cause analysis through a locally-verified PR/MR, scaling process to the lane's `delivery_mode` and `snc_tier`.

## Input

`/dev-fix <issue-url-or-key>`

## Lane Selection

Score with `common-task-complexity-routing`; carry `delivery_mode` from `sdlc` when present, else derive it from risk. The sensitive-change floor still applies.

| Lane (`delivery_mode`) | `snc_tier` | Artifacts | Approval / readiness | Verification | Review |
| --- | --- | --- | --- | --- | --- |
| `brief` | `low` | none; root cause, test, evidence in PR/MR body | none; no readiness gate | failing regression test -> fix -> focused tests + lint; visual QE only if the bug is visual | `fast` code-review |
| `standard` | `medium` | plan inline in PR/MR or one plan file | self-review; readiness only if requirements are ambiguous | TDD + self-review; visual QE for visual bugs | `deep` code-review |
| `extended` | `high` | plan file + task list + walkthrough | HARD STOP + readiness | TDD + independent reviewers; visual QE for visual bugs | `deep` code-review + independent reviewers (`specialist-architecture-guard`, `specialist-security-reviewer` when relevant) + human approval before merge |

`brief` creates no files under `docs/` and needs no worktree; worktree is required for `extended` and optional for `standard`.

## Workflow

### Step 1: Research & Discovery

1. **Analyze ticket**: installed Jira/GitHub/GitLab/ADO MCP first, else exported ticket text. Extract reproduce steps, expected result, actual result.
2. **Cross-check context**: knowledge-base MCP or local code search; locate relevant code.
3. **Plan by lane**: state root cause hypothesis, proposed changes, verification plan.
   - `brief`: keep it in the PR/MR body.
   - `standard`: inline in the PR/MR or one plan file.
   - `extended`: Implementation Plan Template file.
4. **Score**: `snc_tier`/`model_tier` per `common-task-complexity-routing`.
5. **Gates**: `extended` HARD STOP, then `implementation-readiness` (code after READY or approved PARTIAL). `standard` self-review; readiness only when requirements are ambiguous. `brief` none.

Do not propose code changes until repro steps, expected result, and root cause hypothesis are explicit.

### Step 2: Implementation (TDD)

1. **Branch**: worktree for `extended`, optional for `standard`, in-place branch for `brief`.
2. **Track**: `extended` initializes `docs/srs/srs-task-list-[slug].md`; optional for `standard`; none for `brief`.
3. **Code**: implement with `common-tdd` or `@specialist-tdd-implementer` when sub-agents are supported. RED first: failing regression test -> fix -> GREEN. Characterize legacy behavior only when needed.
4. Follow `common-best-practices` and service-specific `AGENTS.md` rules. Run the smallest foreground single-run target with a project timeout or 120-second fallback before escalating.

### Step 3: Local Verification

1. **Focused check first**: reproduce with the failing test, then focused tests + lint. `brief` completes local verification here unless the bug is visual; every lane still runs its review gate in Step 4.
2. **Visual QE** (visual bugs in any lane; all `standard`/`extended` UI fixes): run the dev server, load `quality-engineering-playwright-cli` (web) or `quality-engineering-appium-mcp` (mobile), its preflight, then the first driver rung. Run the repro steps and capture after snapshots. Fix sub-3px regressions only for these visual bugs.
3. **Evidence**: no success claim without fresh local evidence. `brief` records it in the PR/MR body; `standard`/`extended` record it in `docs/srs/srs-walkthrough-[slug].md` when the lane creates artifacts.
4. **Recompute SNC**: run `pnpm snc:diff --declared <snc_tier>`; if the computed tier is higher, apply that tier's approval/review gates before merge.

### Step 4: Deliver PR

1. **Commit**: generate the message with `caveman-commit`.
2. **PR/MR body**: always include root cause, test added or changed, evidence, and a link to the source issue.
3. **Walkthrough**: `extended` writes `docs/srs/srs-walkthrough-[slug].md` from the Walkthrough Template; optional for `standard`; none for `brief`.
4. **Review gate**: `brief` -> `fast` code-review; `standard` -> `deep` code-review; `extended` -> `deep` code-review plus independent reviewers and human approval before merge. No lane is review-free.

---

## Runtime Contract
- Use for bug tickets that need root-cause remediation and a PR/MR.
- Load `common-decision-discipline` and apply its §8 continuation contract at entry and every handoff: the settled result selects the successor and specialized gates dominate.
- Required inputs: issue URL/key or exported ticket text with reproduce steps.
- Lane defaults: `brief` = failing test + focused verification + PR/MR body evidence; `standard` = self-reviewed inline plan; `extended` = full plan, readiness, task list, walkthrough.
- Accepts a `test-loop` `REAL_BUG_DO_NOT_HEAL` handoff as the ticket input: the healer's `TEST:` and `EVIDENCE:` lines plus the failing AC are the reproduce steps.
- Return BLOCKED only when repro steps, expected result, or root-cause hypothesis cannot be established.

## Handoff Payload
- `slug`, `operator_profile` (carried, not re-inferred), `delivery_mode`, `snc_tier`, `model_tier`, plan/task-list/walkthrough paths (omit paths the lane does not create), PR/MR link, outcome report, next workflow.

## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Artifact Templates

> Used by `extended` (plan, task list); `standard` may use the plan or walkthrough inline.

### Implementation Plan Template

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
implementation-readiness
```

### Task Template

```md
# Task: [Name]

## Scope

## Checklist

- [ ] [task]

## Decisions

## Evidence

## Next Workflow
verify-work
```

### Walkthrough Template

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
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: dev-fix, feature_status: implemented, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: verify-work, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow
verify-bug | verify-work
```

## Cost Report

Call `get_session_cost(workflow="dev-fix")` before final handoff.

## Anti-Patterns

- **No Blind Implementation**: Never write code before the lane's plan and gates are satisfied.
- **No Process Inflation**: `brief` creates no files under `docs/`, worktrees, readiness gates, or HARD STOPs.
- **No Orphan Sessions**: Always `close` browser/appium sessions used during verification.
- **No unproven success**: "I checked it manually" is not evidence; record it where the lane requires.
