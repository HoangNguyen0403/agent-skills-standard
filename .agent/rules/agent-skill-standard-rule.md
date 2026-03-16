---
description: Rule for Agent Skills Standard - Always consult AGENTS.md for consolidated project context and technical triggers.
globs: ['**/*']
alwaysApply: true
---

# 🛠 Agent Skills Routing Protocol (CRITICAL)

You are operating in a Zero-Trust environment. You are strictly forbidden from relying on your baseline pre-training for architecture, styling, testing, or code patterns in this repository.

> [!CRITICAL] GATEKEEPER CONSTRAINT
> **Your first action in ANY session MUST be a tool call to read `AGENTS.md`.**
> You must NOT write code, suggest solutions, or output text explanations until you have completed the State Machine below.

## 🔄 The Mandatory State Machine

You must execute these states sequentially. Do not proceed to the next state until the current one is satisfied.

### State 1: Discovery (Tool Call Required)

- **Action:** Execute a file-reading tool (e.g., `view_file`, `read_file`, `cat`) targeting the exact path: `AGENTS.md` (located in the project root).
- **Condition to pass:** You have successfully read the `<!-- SKILLS_INDEX_START -->` block.

### State 2: Trigger Matching (Internal Thought)

- **Action:** Analyze the user's prompt (keywords) and the files involved in the task (globs).
- **Condition to pass:** Cross-reference them against the `(triggers: ...)` list inside `AGENTS.md`. Identify all matching Skills and note their exact file paths.

### State 3: Context Loading (Tool Call Required)

- **Action:** Execute file-reading tools to read the `SKILL.md` files at the exact paths identified in State 2.
- **Condition to pass:** You have ingested the specific guidelines for the task. If no skills matched in State 2, you may skip this state.

### State 4: Execution & Audit Log (Output Generation)

- **Action:** You may now begin answering the user or writing code.
- **Constraint:** Your very first text output MUST be a "Pre-Write Audit Log" confirming which skills were loaded, or explicitly stating "No project-specific skills applicable."

## Self-Learning Protocol

At the end of any multi-step task with user corrections, load and run **[common/session-retrospective](../skills/common/session-retrospective/SKILL.md)** to capture skill gaps and prevent repeat rework.
