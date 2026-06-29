---
name: python-async-runtime
description: Write correct async Python runtime code with explicit blocking-I/O boundaries, cancellation, and timeout handling. Use when editing `asyncio` workflows, background loops, async services, or mixed sync/async integrations.
metadata:
  triggers:
    files:
      - "**/*.py"
    keywords:
      - asyncio
      - async
      - await
      - background task
      - cancellation
      - timeout
---

# Python Async Runtime

## **Priority: P1 (HIGH)**

## Rules

- Keep blocking DB, subprocess, and legacy HTTP calls out of event-loop code.
- Use `asyncio.to_thread` only as an explicit boundary around blocking libraries.
- Make timeout and cancellation behavior visible in the call path.
- Track long-lived tasks, cleanup, and retries deliberately.

## Recipe

1. **Use async-native clients first**.
2. **Wrap blocking calls once** at the adapter seam.
3. **Propagate cancellation and timeout context** instead of swallowing it.
4. **Separate poll loop logic from work-item processing**.
5. **Test the timeout and error path**, not only the happy path.

## Anti-Patterns

- **No direct blocking I/O inside `async def`**.
- **No hidden infinite loops** without stop condition or observability.
- **No broad `except Exception` around await chains** that erases task state.
- **No orphan background tasks** without lifecycle ownership.

## References

- [Framework Map](../references/framework-map.md)
- [Async Boundaries](references/async-boundaries.md)
