## Agent Protocol

See `AGENTS.md` for the Zero-Trust skill loading protocol (applies to all AI agents) and the MCP runtime-enforcement section (when enabled).

## Self-Learning Protocol

At the end of any multi-step task with user corrections, load and run **[common/common-session-retrospective](.claude/skills/common/common-session-retrospective/SKILL.md)** to capture skill gaps and prevent repeat rework.
