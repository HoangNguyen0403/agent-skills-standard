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

5. **🔁 Skill Feedback Sweep (Mandatory)**:

   For each **🔴 BLOCKER** or **🟠 MAJOR** finding, ask:

   > _"Was there an active skill that should have prevented this violation?"_
   - **YES** → Run the feedback command immediately:
     ```bash
     npx agent-skills-standard feedback \
       --skill="[category/skill-id]" \
       --issue="[specific finding from review]" \
       --skill-instruction="[exact rule the skill has or is missing]" \
       --actual-action="[what the code did instead]" \
       --suggestion="[proposed improvement to skill]"
     ```
   - **NO** → Note it: _no relevant skill exists yet_ → Consider if a new skill should be created.

   > [!IMPORTANT]
   > This step is **not optional**. Every BLOCKER that traces to a known skill pattern is a signal
   > that the skill either: (a) didn't trigger correctly, (b) had the wrong rule, or (c) is missing from `.skillsrc`.
   > All three are upstream skill quality problems that must be reported.
