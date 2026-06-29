---
name: python-error-handling
description: Design Python error paths with narrow exceptions, rollback, contextual logs, and preserved blocker truth. Use when handling retries, verifier outcomes, parser failures, or exception flow in Python services.
metadata:
  triggers:
    files:
      - "**/*.py"
    keywords:
      - except
      - exception
      - retry
      - rollback
      - blocker
      - error handling
---

# Python Error Handling

## **Priority: P1 (HIGH)**

## Rules

- Catch the narrowest exception you can explain.
- Roll back mutable state before re-raising or returning failure status.
- Add context to logs and raised errors without discarding the root cause.
- Preserve blocker truth; do not convert real failure into vague success text.

## Recipe

1. **Handle expected failures close to the boundary**.
2. **Re-raise unexpected failures** after cleanup.
3. **Return structured blocker or verdict data** when the caller needs workflow truth.
4. **Test timeout, malformed input, and missing-env paths**.

## Anti-Patterns

- **No silent `except Exception: pass`**.
- **No broad catch that marks work complete** without evidence.
- **No duplicate logging at every stack layer**.
- **No blocker text without owner or next action** when the protocol needs both.

## References

- [Framework Map](../references/framework-map.md)
