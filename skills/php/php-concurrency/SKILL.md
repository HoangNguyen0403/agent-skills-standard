---
name: php-concurrency
description: "Handling concurrency and non-blocking I/O in modern PHP. Use when implementing concurrent requests, async processing, or non-blocking I/O in PHP. (triggers: **/*.php, Fiber, suspend, resume, non-blocking, async)"
---

# PHP Concurrency

## **Priority: P2 (MEDIUM)**

## Structure

```text
src/
└── Async/
    ├── Schedulers/
    └── Clients/
```

## Implementation Guidelines

- **Fibers**: Use `Fiber` for low-level cooperative multitasking (8.1+).
- **Yield Control**: Apply `Fiber::suspend()` to yield within Fibers.
- **I/O Bound**: Target I/O tasks only; avoid for CPU intensive work.
- **Frameworks**: Prefer **Amp** or **ReactPHP** for complex events.
- **Self-Contained**: Ensure Fibers manage their own state/exceptions.
- **Incremental**: Refactor single bottlenecks before full async.

## Anti-Patterns

- **No deeply nested Fiber suspends**: Keep Fiber logic traceable.
- **No blocking I/O inside Fibers**: Use async-compatible libraries.
- **No custom scheduler code**: Use Amp or ReactPHP instead.

## References

- [Fiber Implementation Guide](references/implementation.md)
