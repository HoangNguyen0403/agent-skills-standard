---
description: Rule for Agent Skills Standard - Always consult AGENTS.md for consolidated project context and technical triggers.
applyTo: "**/*"
---

# 🛠 Agent Skills Standard

This project uses a modular skills library for specialized engineering tasks.

> [!IMPORTANT]
> **MANDATORY: At the start of EVERY session, read `AGENTS.md` to load the skill index.**
> Then identify all skills whose triggers match the current task before writing any code.

## Skill Activation Protocol

1. **On session start** → Read `AGENTS.md` (skill index with triggers).
2. **On every task** → Check file globs and keywords against the index.
3. **On skill match** → Read the full `SKILL.md` file before acting.
4. **On file write** → Audit against `common/feedback-reporter` skill.

## Self-Learning Protocol

At the end of any multi-step task with user corrections, load and run **[common/session-retrospective](../skills/common/session-retrospective/SKILL.md)** to capture skill gaps and prevent repeat rework.