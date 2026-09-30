# Subagent-Driven Development (SDD) Methodology

## 1. Execution Confirmation Gate

### Scenario A: Post-Planning Handoff (`writing-plans`)
When an implementation plan has just been created or approved, ask the user before touching code:
> *"Plan complete and saved to `docs/...`. Which execution approach would you prefer?*
> *1. **Subagent-Driven (Recommended)** — Fresh worker per task via cheap execution profile + task review gate. Zero context bloat.*
> *2. **Inline** — Direct implementation in this session (cheaper only for tiny 1-2 file fixes; burns heavy tokens on large plans).*
> *For this plan I recommend Subagent-Driven. Shall I proceed with subagents?"*

### Scenario B: Existing Plan or PR Ingestion (e.g. "implement this plan inside PR ...")
When a user opens a session or supplies an existing multi-task plan/PR:
1. **DO NOT start editing files directly in this session.**
2. Detect the multi-task scope and confirm:
> *"I found a multi-task implementation plan in <source>. To prevent burning main orchestrator tokens across these tasks, I recommend **Subagent-Driven** execution (using cheap worker profiles). Shall I dispatch via subagents or implement inline?"*
3. If approved (or user replies "yes", "proceed", "start", "approve"), immediately proceed with the SDD Task Loop.

---

## 2. SDD vs. TDD

- **SDD (Macro Workflow):** Decomposes plan into tasks, dispatches workers, generates review packages, verifies with independent reviewers, and logs progress to `progress.md`.
- **TDD (Micro Coding):** Follows the RED -> GREEN -> REFACTOR cycle inside each task. SDD mandates that every implementer subagent follows TDD within its assigned task brief.

---

## 3. The 4-Step Task Loop

1. **Dispatch Implementer:**
   - Record base: `BASE=$(git rev-parse HEAD)`
   - Extract brief: `python3 scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER>`
   - Dispatch worker with `[BRIEF_FILE]` and `[REPORT_FILE]`.
2. **Passive Wait (No Polling):**
   - Call `wait()` once and yield control. Never poll `get_agent_status` or `get_agent_activity` in a loop.
3. **Dispatch Reviewer:**
   - Record head: `HEAD=$(git rev-parse HEAD)`
   - Generate package: `python3 scripts/review_package.py <PLAN_FILE> $BASE $HEAD`
   - Dispatch reviewer with `[BRIEF_FILE]`, `[REPORT_FILE]`, and `[DIFF_FILE]`. Call `wait()`.
4. **Fix Loop (Up to 5 Rounds):**
   - Rounds 1–3: Resume existing worker with findings via `send_agent_prompt`.
   - Rounds 4–5: Escalate to higher-tier model if still unresolved.
   - Re-review with `re-review-prompt.md`.
