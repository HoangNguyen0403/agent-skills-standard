---
description: Run an AI-assisted PR code review using the Code Review Expert skill
---

# AI Code Review Workflow

1. **Scope**: Ask user to select review scope (Tip: Use [Request Template](../skills/common/code-review/references/request-template.md) for context):
   - **(A) Diff Review**:
     ```bash
     git fetch origin <base> && git diff origin/<base>...HEAD
     ```
   - **(B) Specific Files**:
     User provides list of paths. Read contents of those files (ensure to ignore files in `.gitignore`).
   - **(C) Full Project**:
     List all source files (ensure to ignore files in `.gitignore`) and review in batches.

2. **Analyze**: Apply the **[Code Review Expert](../skills/common/code-review/SKILL.md)** skill.
   - **Role**: Act as a Principal Engineer.
   - **Focus**: Logic, Security, Architecture (P0).
   - **Context**: Cross-check with active framework skills (e.g. Flutter, React) if detected.

3. **Report**: Output results using the **Standard Review Format** (BLOCKER/MAJOR/NIT).

4. **Implementation Planning**:
   - Ask the user if they want to implement the feedback.
   - If **YES**:
     - Parse the report into a checklist.
     - Add/Update the specific items in `task.md`.
     - Recommend using `skills/common/tdd/SKILL.md` if code changes are required.
