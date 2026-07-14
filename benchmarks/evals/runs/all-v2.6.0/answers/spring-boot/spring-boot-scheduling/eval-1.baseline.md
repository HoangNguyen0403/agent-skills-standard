# Scheduled tasks

Enable scheduling with `@EnableScheduling` and put `@Scheduled` on a Spring-managed bean:

```java
@Component
class CleanupJob {
    @Scheduled(cron = "0 0 * * * *", zone = "UTC")
    void removeExpired() { /* ... */ }
}
```

Use `fixedDelay` when the next run waits for completion and `fixedRate` for regular start intervals. Externalize expressions and timezone. Configure a bounded `TaskScheduler` if jobs can block or overlap; the default single scheduler can delay unrelated jobs. Do not rely on self-invocation for proxy behavior. Make work idempotent, bounded, observable, and explicitly coordinated in a cluster.



