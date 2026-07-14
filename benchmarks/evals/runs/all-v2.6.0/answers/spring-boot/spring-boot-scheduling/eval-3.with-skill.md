Treat a scheduled task as restartable and idempotent. Keep the `@Scheduled` method light, hand long-running work to `@Async` or a durable queue, and configure a dedicated `TaskScheduler` rather than relying on the default one-thread pool. Wrap the boundary in explicit failure handling:

```java
@Scheduled(fixedDelayString = "${jobs.reconcile-delay}")
void run() {
    try {
        reconcile();
    } catch (TransientException ex) {
        log.warn("reconcile failed; retry will be attempted", ex);
        throw ex;
    } catch (Exception ex) {
        log.error("reconcile failed", ex);
    }
}
```

Use `@Retryable` for bounded retries of known transient failures, with backoff; do not retry permanent validation or authorization failures. Record enough structured context to diagnose a failed run and alert after retry exhaustion. In a multi-pod deployment, use ShedLock with finite `lockAtMostFor` and suitable `lockAtLeastFor` if only one pod may execute. Test failure, retry, overlap, pod restart, and duplicate-delivery cases. Never log and silently swallow an exception without deciding whether the job is complete, retryable, or failed.


