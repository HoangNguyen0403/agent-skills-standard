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
2. **Confirm with human partner:** Offer Subagent-Driven (Recommended — fresh workers via cheap tier + task review gate, zero context bloat) vs. Inline (only for tiny 1-2 file changes).
3. If approved (or user replies "yes", "proceed", "start"), invoke SDD. See [methodology.md](references/methodology.md#1-execution-confirmation-gate).

## 2. SDD & TDD Integration

- **Macro (SDD):** Orchestrator manages task decomposition, context isolation, review gates, and progress logging.
- **Micro (TDD):** Implementer subagents must follow the strict RED -> GREEN -> REFACTOR cycle inside their assigned brief.

## 3. Setup & Workspace Resolution

Resolve the isolated, git-ignored workspace directory before Task 1:
```bash
python3 skills/common/common-subagent-driven-development/scripts/sdd_workspace.py <PLAN_FILE>
```
Track task completion in `<workspace>/progress.md` so work survives context compaction.

## 4. The Task Loop

For each task in the plan:
1. **Dispatch Implementer:** Generate brief via `task_brief.py <plan> <N>`. Dispatch worker using a cheap execution tier with `[BRIEF_FILE]` and `[REPORT_FILE]`.
2. **Passive Wait (No Polling):** Call `wait()` and yield control. Never poll status or activity in a loop.
3. **Dispatch Reviewer:** Generate package via `review_package.py <plan> $BASE $HEAD`. Dispatch task reviewer with `[BRIEF_FILE]`, `[REPORT_FILE]`, and `[DIFF_FILE]`.
4. **Fix Loop (Up to 5 Rounds):** Re-prompt existing worker via `send_agent_prompt` with findings; re-review with `re-review-prompt.md`.

## 5. Final Review & Completion

Run `review_package.py <plan> $MERGE_BASE HEAD`. Dispatch a senior reviewer on the most capable model. Once clean, delete `<workspace>` and complete the branch.

## Anti-Patterns

- **No Inline Edits on Multi-Task Plans:** Do not burn orchestrator context editing files directly.
- **No Polling Loops:** Yield control via `wait()`; do not loop `get_agent_status`.
- **No Inlined Context Bloat:** Pass briefs and diffs as file paths, never paste full bodies into chat prompts.

## References

- [Methodology & Gates](references/methodology.md) — execution confirmation scenarios & task loop rules
- [Subagent Prompt Templates](references/templates.md) — implementer, reviewer, and re-reviewer templates
