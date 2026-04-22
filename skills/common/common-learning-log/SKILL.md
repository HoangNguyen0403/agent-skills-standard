---
name: common-learning-log
description: "Append a structured learning entry to AGENTS_LEARNING.md whenever an AI agent makes a mistake. Auto-activates as a composite skill when: a pre-write skill violation is detected and auto-fixed, or when the session retrospective finds a correction loop. Also triggers directly when the user corrects the AI mid-session. Use when: mistake, wrong, redo, that's not right, correction, my bad, fix that error, I made a mistake, agent error, learning log, log mistake, AGENTS_LEARNING.md"
metadata:
  triggers:
    files:
      - 'AGENTS_LEARNING.md'
    keywords:
      - mistake
      - wrong
      - redo
      - correction
      - agent error
      - learning log
---

# Agent Learning Log

## **Priority: P1 (OPERATIONAL)**

Write structured mistake entry to `AGENTS_LEARNING.md` in project root before retrying any corrected action.

## Protocol

1. **Detect signal** — identify which surface triggered this skill:

- `Pre-write violation` — `common-feedback-reporter` violation block emitted with `Auto-fixed: YES`
- `User correction` — user used correction language mid-session
- `Session retrospective` — correction loop found during `common-session-retrospective`

2. **Read `AGENTS_LEARNING.md`** — count existing `## Agent Learning Log: Iteration` headers → N
3. **Append entry** — write Iteration #(N+1) using format in [Log Entry Format](references/log-format.md)
4. **Continue** — proceed with corrected action (non-blocking)

## Guidelines

- **One entry per correction event** — not one per file or per task
- **Concrete mistakes only** — name specific file, rule, or action that wrong
- ** "Better Approach" must actionable** — state what to , not what to avoid
- **Create file if missing** — bootstrap with header from [Log Entry Format](references/log-format.md)
- **Never skip for "minor" corrections** — all corrections learning signals

## Anti-Patterns

- **No vague mistakes**: `"I made a mistake"` → name specific pattern or rule violated
- **No skipping log**: Even if already in hurry to fix, append entry first (it takes <10 seconds)
- **No duplicate entries**: One correction event = one entry, even if multiple files affected
- **No overwriting**: Always append to bottom; never edit past entries

## References

- [Log Entry Format](references/log-format.md) — full entry template + AGENTS_LEARNING.md bootstrap
