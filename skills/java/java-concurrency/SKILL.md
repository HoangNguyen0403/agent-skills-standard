---
name: java-concurrency
description: Implement modern concurrency with Virtual Threads and Structured Concurrency in Java. Use when implementing Java Virtual Threads (Java 21), Structured Concurrency with StructuredTaskScope, CompletableFuture pipelines, or debugging race conditions.
metadata:
  triggers:
    files:
    - '**/*.java'
    keywords:
    - Thread
    - Executor
    - synchronized
    - lock
    - CompletableFuture
    - StructuredTaskScope
    - VirtualThread
    - AtomicInteger
    - async
    - race condition
---
# Java Concurrency

## **Priority: P1 (HIGH)**


## Implementation Guidelines

- **Virtual Threads (Java 21)**: Use for high-throughput I/O. `Executors.newVirtualThreadPerTaskExecutor()`.
- **Structured Concurrency**: Use `StructuredTaskScope` to treat related tasks as single unit (Scope, Fork, Join).
- **Immutability**: Share immutable data between threads to avoid race conditions.
- **CompletableFuture**: Use for composing async pipelines (if not using Virtual Threads).
- **Atomic Variables**: Use `AtomicInteger`, `LongAdder` for simple counters.
- **Locks**: Prefer `ReentrantLock` / `ReadWriteLock` over `synchronized` for fine-grained control.
- **Thread Safety**: Document `@ThreadSafe` or `@NotThreadSafe`.

## Anti-Patterns

- **No new Thread()**: Use Executors or virtual threads; never create threads manually.
- **No Pooling Virtual Threads**: Virtual threads cheap; never pool them.
- **No Blocking in synchronized**: Pins carrier thread (Loom pitfall); use ReentrantLock instead.
- **No Shared Mutable State**: Share only immutable data between threads.
- **No Thread.stop/suspend**: Deprecated; use interruption or cancellation instead.

## References

- [StructuredTaskScope & VirtualThread Examples](references/structured-concurrency.md)