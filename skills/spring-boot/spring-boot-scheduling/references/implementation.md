# Scheduling Implementation Examples

## Distributed Scheduled Task (Safe)

```java
@Service
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")
public class ReportScheduler {

    @Scheduled(cron = "0 0 12 * * *") // Daily at noon
    @SchedulerLock(
        name = "dailyReport",
        lockAtLeastFor = "5m", // Don't run again for 5m even if task finishes instantly
        lockAtMostFor = "1h"   // Release lock after 1h even if task hangs
    )
    public void generateDailyReport() {
        // ...
    }
}
```

## Scheduler Pool Configuration

```java
@Configuration
public class SchedulerConfig {
    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5); // Allow 5 concurrent schedules
        scheduler.setThreadNamePrefix("scheduled-task-");
        return scheduler;
    }
}
```
