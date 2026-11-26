---
name: java-concurrency
description: Implement modern concurrency with Virtual Threads and Structured Concurrency in Java. Use when implementing Java Virtual Threads (Java 21+), Structured Concurrency with StructuredTaskScope, CompletableFuture pipelines, or debugging race conditions.
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

- **Virtual Threads (Java 21+, stable)**: Use for high-throughput I/O. `Executors.newVirtualThreadPerTaskExecutor()`.
- **Structured Concurrency (preview)**: `StructuredTaskScope` is a **preview** API in JDK 21 and still preview in current JDKs, and its API changed between previews. Use it only when the project opts in: pin the exact JDK, add `--enable-preview` to compilation **and** runtime, and check that JDK's javadoc. Otherwise use a virtual-thread executor and observe completions in arrival order (`ExecutorCompletionService`) so a failure in either task is seen and unfinished siblings are interrupted — plain `CompletableFuture` cancellation does not interrupt.
- **Immutability**: Share immutable data between threads to avoid race conditions.
- **CompletableFuture**: Use for composing async pipelines (if not using Virtual Threads).
- **Atomic Variables**: Use `AtomicInteger`, `LongAdder` for simple counters.
- **Locks**: `synchronized` is correct mutual exclusion. Prefer `ReentrantLock` / `ReadWriteLock` when you need timed/try/interruptible locking, fairness, or multiple conditions — not merely to avoid carrier pinning.
- **Thread Safety**: Document `@ThreadSafe` or `@NotThreadSafe`.

## Anti-Patterns

- **No new Thread()**: Use Executors or virtual threads; never create threads manually.
- **No Pooling Virtual Threads**: Virtual threads cheap; never pool them.
- **No Preview by Default**: Never recommend a preview API as production guidance without an explicit project opt-in and exact-JDK pin.
- **No Blanket synchronized Ban**: JDK 21–23 pins the carrier while blocking inside a monitor; JDK 24+ ([JEP 491](https://openjdk.org/jeps/491)) removes that. Judge by contention and lock needs, and measure before making performance claims.
- **No Shared Mutable State**: Share only immutable data between threads.
- **No Thread.stop/suspend**: Deprecated; use interruption or cancellation instead.

## References

- [StructuredTaskScope & VirtualThread Examples](references/structured-concurrency.md)