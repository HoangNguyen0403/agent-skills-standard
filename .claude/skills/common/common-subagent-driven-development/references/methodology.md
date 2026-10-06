# Subagent-Driven Development (SDD) Methodology

## 1. Execution Confirmation Gate

### Scenario A: Post-Planning Handoff (`writing-plans`)
When an implementation plan has just been created or approved, confirm with the human partner before touching code:
> *"Plan complete and saved to `docs/...`. Which execution approach would you prefer?*
> *1. **Subagent-Driven (Recommended)** — Fresh worker per task for context isolation and task review gates.*
> *2. **Inline** — Direct implementation in this session (suitable for small bounded changes).*
> *For this plan I recommend Subagent-Driven. Shall I proceed with subagents?"*

### Scenario B: Existing Plan or PR Ingestion (e.g. "implement this plan inside PR ...")
When a user opens a session or supplies an existing multi-task plan/PR:
1. **DO NOT start editing files directly in this session.**
2. Detect the multi-task scope and confirm:
> *"I found a multi-task implementation plan in <source>. To maintain task isolation and review gates across tasks, I recommend **Subagent-Driven** execution. Shall I dispatch via subagents or implement inline?"*
3. If approved (or user replies "yes", "proceed", "start", "approve"), immediately proceed with the SDD Task Loop.
---

## 2. SDD vs. TDD

- **SDD (Macro Workflow):** Decomposes plan into tasks, dispatches workers, generates review packages, verifies with independent reviewers, and logs progress to `progress.md`.
- **TDD (Micro Coding):** Follows the RED -> GREEN -> REFACTOR cycle inside each task. SDD mandates that every implementer subagent follows TDD within its assigned task brief.

---

## 3. The Task Loop & Worker Contract

1. **Record Baseline & Dispatch Implementer:**
   - Record baseline: `BASE=$(git rev-parse HEAD)`
   - Extract brief from the repository root: `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER>`.
   - Dispatch worker with `[BRIEF_FILE]` and `[REPORT_FILE]`.
   - **Worker Contract**: Worker owns bounded implementation and focused tests on touched files. Worker does NOT commit with Git, recursively delegate to subagents, or run full suites by default.
2. **Passive Wait (No Polling):**
   - Call `wait()` once and yield control. Never poll `get_agent_status` or `get_agent_activity` in a loop.
3. **Scoped Review Package & Review:**
   - Generate scoped package from worker's owned paths:
     `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>` (explicit literal file paths or bounded owned directories only; no broad/magic scopes).
   - Dispatch reviewer with `[BRIEF_FILE]`, `[REPORT_FILE]`, and `[DIFF_FILE]`. Call `wait()`.
4. **Fix Loop (Up to 5 Rounds):**
   - Rounds 1–3: Resume existing worker with findings via `send_agent_prompt`.
   - Rounds 4–5: Escalate to higher-tier model if still unresolved.
   - Re-generate an immutable cumulative package from the original `$BASE` and identical owned paths: `python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $BASE WORKSPACE --paths <OWNED_PATHS...>`. The default filename includes the package-content digest; each changed fix round is retained as a separate snapshot.
   - Re-review the open findings against the latest cumulative `BASE..WORKSPACE` state. This artifact is not a fix-only diff; report regressions in the cumulative task-owned result without claiming they were introduced only by the latest round.
5. **Orchestrator Integration:**
   - Orchestrator verifies diff, runs full suite regression checks if required by tier, and commits the task changes with git.

## 4. Final Review & Completion

Run whole-branch review:
```bash
python3 skills/common/common-subagent-driven-development/scripts/review_package.py <PLAN_FILE> $MERGE_BASE HEAD
```
Dispatch a senior reviewer on the most capable model. Once clean, delete `<workspace>` and complete the branch.
