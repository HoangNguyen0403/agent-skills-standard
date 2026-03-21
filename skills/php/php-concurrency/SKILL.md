---
name: php-concurrency
description: 'Handling concurrency and non-blocking I/O in modern PHP. Use when implementing concurrent requests, async processing, or non-blocking I/O in PHP. (triggers: **/*.php, Fiber, suspend, resume, non-blocking, async)'
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

### PHP Fibers (8.1+)

- **Multitasking**: Use **`new Fiber()`** for low-level cooperative multitasking.
- **Yielding Control**: Use **`Fiber::suspend('paused')`** to yield execution back to the caller.
- **Resuming**: Call **`$fiber->resume('hello')`** to continue execution. Catch exceptions via **`$fiber->getReturn()`**.
- **Isolation**: Use **separate PDO connections per Fiber** to avoid shared mutable state.

### Non-blocking I/O & Event Loops

- **Loop Setup**: Use **ReactPHP** or **Amp**. Call **`Loop::get()`** to access the event loop.
- **HTTP Clients**: Use **`react/http`** or the **Guzzle `Pool($client, ...)`** for concurrent requests.
- **I/O Safety**: **Never use blocking `file_get_contents` or `sleep()`** inside a Fiber or EventLoop.
- **Entry Point**: Run **`Loop::run()`** at your application entry point to start the async loop.

### Concurrency Strategies

- **Queued Jobs**: For heavy concurrency, prefer **Laravel Horizon** or **Symfony Messenger** over raw PHP Fibers.
- **Self-Contained Logic**: Ensure Fibers manage their own state and exceptions to prevent cross-contamination.

## Anti-Patterns

- **No deeply nested Fiber suspends**: Keep Fiber logic traceable.
- **No blocking I/O inside Fibers**: Use async-compatible libraries.
- **No custom scheduler code**: Use Amp or ReactPHP instead.

## References

- [Fiber Implementation Guide](references/implementation.md)
