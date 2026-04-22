---
name: common-performance-engineering
description: Enforce universal standards for high-performance development. Use when profiling bottlenecks, reducing latency, fixing memory leaks, improving throughput, or optimizing algorithm complexity in any language.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.tsx'
    - '**/*.go'
    - '**/*.dart'
    - '**/*.java'
    - '**/*.kt'
    - '**/*.swift'
    - '**/*.py'
    keywords:
    - performance
    - optimize
    - profile
    - scalability
    - latency
    - throughput
    - memory leak
    - bottleneck
---
# Performance Engineering Standards

## **Priority: P0 (CRITICAL)**

## Workflow

1. **Baseline**: Profile before changing anything — measure CPU, memory, and latency.
2. **Identify**: Find top bottleneck (N+1 query, hot loop, memory leak).
3. **Fix**: Apply targeted optimization from sections below.
4. **Verify**: Re-profile to confirm improvement and check for regressions.

## Resource Management

- **Memory Efficiency**:
 - Avoid memory leaks: explicit cleanup of listeners, observers, and streams.
 - Optimize data structures: `Set` for lookups, `List` for iteration.
 - Lazy Initialization: Initialize expensive objects only when needed.
- **CPU Optimization**:
 - Aim for O(1) or O(n); avoid O(n^2) in critical paths.
 - Offload heavy computations to background threads or workers.
 - Memoize pure, expensive functions.

See [implementation examples](references/implementation.md) for memoization and batching patterns.

## Network & I/O

- **Payload Reduction**: Use efficient serialization (Protobuf, JSON minification) and compression (gzip/br).
- **Batching**: Group multiple small requests into single bulk operations.
- **Caching**: Implement multi-level caching (Memory -> Storage -> Network) with appropriate TTL and invalidation.
- **Non-blocking I/O**: Always use asynchronous operations for file system and network access.

## UI/UX Performance

- **Minimize Main Thread Work**: Keep animations and interactions fluid by offloading to workers.
- **Virtualization**: Use lazy loading or virtualization for long lists/large datasets.
- **Tree Shaking**: Ensure build tools remove unused code and dependencies.

## Monitoring & Testing

- **Benchmarking**: Write micro-benchmarks for performance-critical functions.
- **SLIs/SLOs**: Define Service Level Indicators (latency, throughput) and Objectives.
- **Load Testing**: Test system behavior under peak and stress conditions.

## Anti-Patterns

- **No premature optimization**: Profile first, fix proven bottlenecks only.
- **No N+1 queries**: Always batch and paginate data-access operations.
- **No synchronous I/O on main thread**: Async all file/network access.

## References

- [Implementation Patterns](references/implementation.md) — profiling patterns, benchmark setup