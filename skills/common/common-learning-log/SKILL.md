---
name: common-learning-log
description: "Append a structured learning entry to AGENTS_LEARNING.md whenever an AI agent makes a mistake. Auto-activates as a composite skill when: a pre-write skill violation is detected and auto-fixed, or when the session retrospective finds a correction loop. Also triggers directly when the user corrects the AI mid-session. Use when: mistake, wrong, redo, that's not right, correction, my bad, fix that error, I made a mistake, agent error, learning log, log mistake, AGENTS_LEARNING.md (triggers: AGENTS_LEARNING.md, mistake, wrong, redo, correction, agent error, learning log)"
---

# Agent Learning Log

## **Priority: P1 (OPERATIONAL)**

Write a structured mistake entry to `AGENTS_LEARNING.md` in the project root before retrying any corrected action.

## Protocol

1. **Detect signal** — identify which surface triggered this skill:
   - `Pre-write violation` — a `common-feedback-reporter` violation block was emitted with `Auto-fixed: YES`
   - `User correction` — user used correction language mid-session
   - `Session retrospective` — a correction loop was found during `common-session-retrospective`
2. **Read `AGENTS_LEARNING.md`** — count existing `## Agent Learning Log: Iteration` headers → N
3. **Append entry** — write Iteration #(N+1) using the format in [Log Entry Format](references/log-format.md)
4. **Continue** — proceed with the corrected action (non-blocking)

## Guidelines

- **One entry per correction event** — not one per file or per task
- **Concrete mistakes only** — name the specific file, rule, or action that was wrong
- **The "Better Approach" must be actionable** — state what to do, not what to avoid
- **Create file if missing** — bootstrap with the header from [Log Entry Format](references/log-format.md)
- **Never skip for "minor" corrections** — all corrections are learning signals

## Anti-Patterns

- **No vague mistakes**: `"I made a mistake"` → name the specific pattern or rule violated
- **No skipping the log**: Even if already in a hurry to fix, append the entry first (it takes <10 seconds)
- **No duplicate entries**: One correction event = one entry, even if multiple files were affected
- **No overwriting**: Always append to the bottom; never edit past entries

## References

- [Log Entry Format](references/log-format.md) — full entry template + AGENTS_LEARNING.md bootstrap
