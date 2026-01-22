---
name: Java Concurrency
description: Modern concurrency patterns using Virtual Threads and Structured Concurrency.
metadata:
  labels: [java, concurrency, threads, async, loom]
  triggers:
    files: ['**/*.java']
    keywords: [thread, async, future, executor, synchronized, lock, await]
---

# Java Concurrency

## **Priority: P1 (HIGH)**

Modern concurrent programming emphasizing Virtual Threads (Loom) and safety.

## Implementation Guidelines

- **Virtual Threads (Java 21)**: Use for high-throughput I/O. `Executors.newVirtualThreadPerTaskExecutor()`.
- **Structured Concurrency**: Use `StructuredTaskScope` to treat related tasks as a single unit (Scope, Fork, Join).
- **Immutability**: Share immutable data between threads to avoid race conditions.
- **CompletableFuture**: Use for composing asynchronous pipelines (if not using Virtual Threads).
- **Atomic Variables**: Use `AtomicInteger`, `LongAdder` for simple counters.
- **Locks**: Prefer `ReentrantLock` / `ReadWriteLock` over `synchronized` blocks for fine-grained control.
- **Thread Safety**: Document `@ThreadSafe` or `@NotThreadSafe`.

## Anti-Patterns

- **`new Thread()`**: Never manually create threads. Use Executors.
- **Thread Pooling Virtual Threads**: Virtual threads are cheap; do not pool them.
- **Blocking inside `synchronized`**: Pins the carrier thread (Loom pitfall). Use `ReentrantLock`.
- **Shared Mutable State**: The root of all concurrency bugs.
- **`Thread.stop/suspend`**: Deprecated and dangerous.

## Code

For full `StructuredTaskScope` and `VirtualThread` examples:
[references/structured-concurrency.md](references/structured-concurrency.md)

```java
// Virtual Threads (Loom)
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var user = scope.fork(() -> api.fetchUser());
    scope.join().throwIfFailed();
}
```

## Related Topics

language | best-practices
