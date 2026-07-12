# Preventing duplicate cluster jobs

`@Scheduled` runs on every application instance. Use a distributed mechanism when one active worker is required: ShedLock with a shared database/Redis lock provider, clustered Quartz, Kubernetes leader election, or a platform scheduler that dispatches to a queue.

With ShedLock, set `lockAtMostFor` longer than the worst run and use `lockAtLeastFor` only when a minimum interval is required. A lock is not a complete correctness guarantee: make work idempotent, use database uniqueness/claiming, handle owner crashes and lease expiry, and observe contention and missed runs. Test concurrent replicas, long execution, clock behavior, and owner failure.



