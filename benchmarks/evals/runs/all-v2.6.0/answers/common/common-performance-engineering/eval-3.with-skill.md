Do not preemptively optimize every function. The performance standard requires a baseline and profiling before changes: measure relevant CPU, memory, latency, throughput, and I/O behavior, then identify the highest-impact bottleneck. Premature optimization spends complexity budget on code that may not matter and can introduce regressions.

Use a lightweight prevention process instead:

- Define SLIs/SLOs for critical paths, such as p95 latency, throughput, memory ceiling, startup time, or interaction latency.
- Add representative micro-benchmarks for genuinely performance-critical pure functions, plus load tests for service behavior under peak and stress conditions.
- Instrument production paths so regressions can be detected with CPU, memory, query count, I/O, and latency data.
- When a regression appears, reproduce it, profile it, fix the measured top bottleneck, and re-profile to prove improvement and check correctness and resource regressions.
- Keep algorithms near O(1) or O(n) on critical paths, use appropriate data structures, batch small I/O requests, cache only with bounded TTL/invalidation, and use asynchronous file/network operations. Apply memoization only to pure, expensive work where measurements justify it.

This approach still permits preventive engineering where evidence already exists—for example, enforcing query-count limits, pagination, bounded caches, cleanup of listeners/streams, or build-size budgets—but it does not justify changing all functions without a measured problem.
