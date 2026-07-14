`@Scheduled` executes in every application instance. In Kubernetes, that means a three-pod deployment can run the same job three times. Use ShedLock backed by a shared database or other supported store:

```java
@Scheduled(cron = "0 */5 * * * *")
@SchedulerLock(name = "reconcileOrders", lockAtMostFor = "4m", lockAtLeastFor = "30s")
void reconcileOrders() { ... }
```

Enable ShedLock for scheduled tasks and choose `lockAtMostFor` longer than the normal maximum runtime, but finite so a crashed pod cannot hold the lock forever. Use `lockAtLeastFor` to prevent rapid duplicate execution when the job finishes quickly. The lock store must be shared by all replicas.

This is coordination, not a replacement for idempotency. Make the job safe to repeat, use a dedicated `TaskScheduler` instead of the default one-thread pool, and offload long work to a queue when appropriate. Verify two live instances, overlapping execution, lock expiry after a crash, and retry behavior. If every pod should process its own partition, use an explicit partitioning/queue design instead of a global lock.


