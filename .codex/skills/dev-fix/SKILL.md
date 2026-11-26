---
name: dev-fix
description: "Unified developer workflow for fixing bugs. Analyzes issue-tracker context, cross-checks docs/code, proposes a solution, implements the fix, verifies locally, and delivers a PR/MR."
metadata:
  internal: true
  triggers:
    keywords:
    - dev fix
    - workflow
---
# Dev Fix Skill

> [!IMPORTANT]
> Unified developer workflow for fixing bugs. Analyzes issue-tracker context, cross-checks docs/code, proposes a solution, implements the fix, verifies locally, and delivers a PR/MR.

Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.

## Instructions

When the user asks to perform this workflow, execute the following steps:


# Dev-Fix — Bug Remediation

Goal: Take a bug ticket from root-cause analysis through a locally-verified PR/MR, scaling process to the lane's `delivery_mode` and `snc_tier`.

## Input

`/dev-fix <issue-url-or-key>`

## Lane Selection

Score with `common-task-complexity-routing`; carry `delivery_mode` from `sdlc` when present, else derive it from risk. The sensitive-change floor still applies.

| Lane (`delivery_mode`) | `snc_tier` | Artifacts | Approval / readiness | Verification | Review |
| --- | --- | --- | --- | --- | --- |
| `brief` | `low` | none; root cause, test, evidence in PR/MR body | none; no readiness gate | failing regression test -> fix -> focused tests + lint; visual QE only if the bug is visual | `fast` code-review |
| `standard` | `medium` | plan inline in PR/MR or one plan file | self-review; readiness only if requirements are ambiguous | TDD + self-review; visual QE for visual bugs and all UI fixes | `deep` code-review |
| `extended` | `high` | plan file + task list + walkthrough | HARD STOP + readiness | TDD + independent reviewers; visual QE for visual bugs and all UI fixes | `deep` code-review + independent reviewers (`specialist-architecture-guard`, `specialist-security-reviewer` when relevant) + human approval before merge |

`brief` creates no files under `docs/` and needs no worktree; worktree is required for `extended` and optional for `standard`.

## Workflow

1. **Research**: read the ticket from a configured tracker integration or exported text and extract reproduce steps, expected result, and actual result; tracker access is read-only. Cross-check code and docs, then state the root-cause hypothesis, proposed changes, and verification plan. No code change before steps, expected result, and hypothesis are explicit.
2. **Plan by lane**: `brief` keeps the plan in the PR/MR body, `standard` inline or in one plan file, `extended` in the plan and task templates. Score `snc_tier`/`model_tier`; `extended` stops at readiness and writes code only after READY or approved PARTIAL. `standard` self-reviews and needs readiness only for ambiguous requirements.
3. **Implement (TDD)**: branch per lane; `extended` tracks slices in the task list. Use `common-tdd` or `@specialist-tdd-implementer` when sub-agents are supported: failing regression test -> fix -> GREEN, characterizing legacy behavior only when needed. Follow `common-best-practices` and service `AGENTS.md`; run the smallest foreground single-run target with a project timeout or 120-second fallback before escalating.
4. **Verify locally**: reproduce with the failing test, then focused tests + lint. Run visual QE for visual bugs in any lane and for all `standard`/`extended` UI fixes (dev server, `quality-engineering-playwright-cli` for web or `quality-engineering-appium-mcp` for mobile, its preflight, then the first driver rung): replay the repro steps against the reviewed revision and capture after snapshots. Fix sub-3px regressions only for these visual bugs. Record evidence where the lane keeps artifacts; no success claim without fresh local evidence. Recompute with `pnpm snc:diff --declared <snc_tier>` and apply a higher tier's gates before merge.
5. **Deliver**: commit message via `caveman-commit`; the PR/MR body always carries root cause, test changed, evidence, and the source issue link; `extended` writes the walkthrough. Run the lane's review gate: no lane is review-free.

## Artifact Templates

Load `references/pr-audit-workflow-templates.md` from installed `common/common-workflow-writing` or flattened `common-common-workflow-writing`: resolve `<SKILLS>` to the active provider skills root, checking nested providers (for example `.claude/skills` or `.codex/skills`) and flattened providers (for example `.kiro/skills`). Use its plan, task-list, and walkthrough shapes. Fall back to `skills/common/common-workflow-writing` only when that source tree exists.

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: dev-fix, feature_status: "[evidence-derived status]", started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: "[evidence-selected workflow or null]", cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}
## Next Workflow
verify-work | verify-bug | null

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

## Anti-Patterns

- **No Blind Implementation**: Never write code before the lane's plan and gates are satisfied.
- **No Tracker Writes**: A ticket read never authorizes a comment, upload, label, transition, or delete.
- **No Process Inflation**: `brief` creates no files under `docs/`, worktrees, readiness gates, or HARD STOPs.
- **No Orphan Sessions**: Always `close` browser/appium sessions used during verification.
- **No unproven success**: "I checked it manually" is not evidence; record it where the lane requires.

## Cost Report

Call `get_session_cost(workflow="dev-fix")` before final handoff.

