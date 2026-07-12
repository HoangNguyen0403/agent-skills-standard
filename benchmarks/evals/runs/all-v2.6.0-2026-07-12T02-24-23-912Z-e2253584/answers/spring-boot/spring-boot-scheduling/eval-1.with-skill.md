Enable scheduling and configure a dedicated `TaskScheduler`; Spring's default scheduler has only one thread and can serialize unrelated jobs:

```java
@Configuration
@EnableScheduling
class SchedulingConfig {
    @Bean
    TaskScheduler taskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(8);
        scheduler.setThreadNamePrefix("scheduled-");
        scheduler.initialize();
        return scheduler;
    }
}
```

Keep each `@Scheduled` method small and idempotent. Offload long work to `@Async` or a queue, and size the executor deliberately. Use an explicit cron or fixed delay that matches the business requirement, and wrap the job so transient failures are logged and retried with `@Retryable` where appropriate. Do not let an exception disappear or block the scheduler thread indefinitely.

In a multi-pod deployment, `@Scheduled` runs in every pod. Add ShedLock with a shared store and set both `lockAtMostFor` (deadlock safety) and `lockAtLeastFor` (debounce) when only one execution is allowed. Test startup, overlap, failure, retry, and restart behavior; assume a pod can stop at any point and design the task to tolerate reruns.


