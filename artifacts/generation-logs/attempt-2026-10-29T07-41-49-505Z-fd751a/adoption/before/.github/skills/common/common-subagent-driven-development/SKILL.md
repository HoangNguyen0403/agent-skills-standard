---
name: common-subagent-driven-development
description: Execute multi-task implementation plans by dispatching a fresh implementer subagent per task with independent review gates. Use when implementing plans, executing multi-task PRs, or transitioning from planning to implementation.
metadata:
  triggers:
    files:
    - 'docs/**/plans/*.md'
    - '.agent/sdd/**'
    - '*plan*.md'
    - 'TODO.md'
    keywords:
    - subagent-driven-development
    - implement plan
    - execute plan
    - implement this plan
    - implement PR
    - implement tasks
    - execute tasks
    - start implementation
    - plan implementation
    - subagent driven
    - multi-task implementation
    - sdd
---

# Subagent-Driven Development (SDD)

## **Priority: P1 (HIGH)**

Execute multi-task implementation plans by dispatching a fresh implementer subagent per task, an independent task review (spec compliance + code quality) after each, and a whole-branch review at the end.

## 1. Execution Confirmation Gate (Scenario A & B)

Before editing code for any multi-task plan:
1. **DO NOT start editing files directly in this orchestrator session.**
2. **Confirm with human partner:** Host approval policy overrides defaults. Offer Subagent-Driven (Recommended — fresh workers per task for context isolation + task review gate) vs. Inline (direct implementation in orchestrator session for small bounded changes).
3. If approved (or user replies "yes", "proceed", "start", "approve"), invoke SDD. See [methodology.md](references/methodology.md#1-execution-confirmation-gate).

## 2. SDD & The Single Worker Contract

- **Macro (SDD Orchestrator):** Manages task decomposition, workspace isolation, brief generation, independent review gates, Git commits, and final integration verification.
- **Worker Contract:** Implementer subagents own bounded implementation and focused verification of touched files. Workers do NOT commit changes with Git, recursively delegate to other agents, or run full project test suites by default.
- **Micro (TDD):** Implementer subagents follow the RED -> GREEN -> REFACTOR cycle inside their assigned brief.
## 3. Setup & Workspace Resolution

Resolve the isolated, git-ignored workspace directory before Task 1:
```bash
python3 skills/common/common-subagent-driven-development/scripts/sdd_workspace.py <PLAN_FILE>
```
Track task completion in `<workspace>/progress.md` so work survives context compaction.

Use the local version-2 explicit progress helper for revision/evidence-bound checkpoints; it does not enforce host pauses, authorization, or wakeups. See [Progress Receipts](references/progress-receipts.md).

## 4. The Task Loop

For each task in the plan:
1. **Record Baseline & Dispatch Implementer:** Record `BASE=$(git rev-parse HEAD)`. From the repository root, generate the brief with `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER>`. Dispatch worker with `[BRIEF_FILE]` and `[REPORT_FILE]`.
2. **Passive Wait (No Polling):** Call `wait()` and yield control. Never poll status or activity in a loop.
3. **Scoped Review Package & Review:** From the repository root, run `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>`. Workspace mode requires explicit literal file paths or bounded owned directories (no Git pathspec magic, globs, `.`, or overlapping scopes). Each changed workspace snapshot gets a content-addressed immutable default filename; same-base/scope packages are cumulative from `$BASE`, not fix-only. Dispatch reviewer with `[BRIEF_FILE]`, `[REPORT_FILE]`, and `[DIFF_FILE]`.
4. **Fix Loop (Up to 5 Rounds):** Re-prompt the worker; regenerate the cumulative package from the original `$BASE` and identical owned paths. The latest package includes all task changes through that round; re-review the open findings against that cumulative state and do not describe it as a fix-only diff.
5. **Orchestrator Integration:** Orchestrator verifies diff, runs full suite checks if required, and creates git commit.

## 5. Final Review & Completion

Run whole-branch review from the repository root: `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $MERGE_BASE HEAD`. Dispatch senior reviewer on capable model. Once clean, delete `<workspace>` and complete branch.
## Anti-Patterns

- **No Worker Commits:** Workers leave edits in the workspace and report diffs/evidence; the orchestrator commits.
- **No Recursive Delegation:** Implementers do not spawn subagents.
- **No Full-Suite Runs by Workers:** Workers run focused tests; orchestrator runs broad verification during integration.
- **No Speculative Savings Claims:** Describe context isolation factually, not with guaranteed percentages.
- **No Inline Edits on Multi-Task Plans:** Do not burn orchestrator context editing files directly.
- **No Polling Loops:** Yield control via `wait()`; do not loop `get_agent_status`.
- **No Inlined Context Bloat:** Pass briefs and diffs as file paths, never paste full bodies into chat prompts.
## References

- [Methodology & Gates](references/methodology.md) — execution confirmation scenarios & task loop rules
- [Subagent Prompt Templates](references/templates.md) — implementer, reviewer, and re-reviewer templates
