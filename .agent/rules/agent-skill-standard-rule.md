---
description: Rule for Agent Skills Standard - Always consult AGENTS.md for consolidated project context and technical triggers.
globs: ['**/*']
alwaysApply: true
---

# 🛠 Agent Skills Standard

This project uses a modular skills library for specialized engineering tasks.

> [!IMPORTANT]
> **MANDATORY: At the start of EVERY session, read `AGENTS.md` to load the skill index.**
> Then identify all skills whose triggers match the current task before writing any code.

## Strict Pre-Flight Protocol (Blocking)

> [!CRITICAL]
> **DO NOT WRITE CODE OR ANSWER QUESTIONS UNTIL YOU HAVE COMPLETED THESE STEPS. This is a mandatory pre-flight checklist.**

1. **Step 1: Read Index** → Call the `view_file` tool on `AGENTS.md` to load the skill index and triggers.
2. **Step 2: Compare Context** → Check the user's prompt (keywords) and involved files (globs) against the index triggers.
3. **Step 3: Load Skills** → Call `view_file` to read the full `SKILL.md` for _every_ matching skill.
4. **Step 4: Audit Output** → Before writing or editing any code, verify your proposed solution adheres to the loaded skills.

_Only after completing Step 3 may you begin reasoning about or executing the user's request._

## Self-Learning Protocol

At the end of any multi-step task with user corrections, load and run **[common/session-retrospective](../skills/common/session-retrospective/SKILL.md)** to capture skill gaps and prevent repeat rework.