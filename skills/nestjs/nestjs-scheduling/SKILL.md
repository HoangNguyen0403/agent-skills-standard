---
name: nestjs-scheduling
description: "Distributed cron jobs and locking patterns. Use when implementing scheduled tasks or distributed locking patterns in NestJS. (triggers: **/*.service.ts, @Cron, CronExpression, ScheduleModule)"
---

# Task Scheduling & Jobs

## **Priority: P1 (OPERATIONAL)**

Background job processing and scheduled task patterns.

- **Problem**: `@Cron()` runs on **every** instance. In K8s with 3 pods, your "Daily Report" runs 3 times.
- **Solution**: **Distributed Locking** using Redis.
  - **Pattern**: Using a decorator to wrap the cron method.
  - **Logic**: `SET resource_name my_random_value NX PX 30000` (Redis Atomic Set).

## Cron Decorator Pattern

- **Implementation**:

  ```typescript
  @Cron(CronExpression.EVERY_MINUTE)
  @DistributedLock({ key: 'send_emails', ttl: 5000 })
  async handleCron() {
    // Only runs if lock acquired
  }
  ```

- **Tools**: Use `nestjs-redlock` or custom Redis wrapper via `redlock` library.

## Job Robustness

- **Isolation**: Never perform heavy processing inside the Cron handler.
  - **Pattern**: Cron -> Push Job ID to Queue (BullMQ) -> Worker processes it.
  - **Why**: Cron schedulers can get blocked by the Event Loop; Workers are scalable.
- **Error Handling**: Wrap ALL cron logic in `try/catch`. Uncaught exceptions in a Cron job can crash the entire Node process.


## Anti-Patterns

- **No unguarded cron logic**: Always wrap in `try/catch`; uncaught exceptions crash the entire Node process.
- **No direct cron processing**: Push to BullMQ queue; workers are scalable, cron handlers are not.
- **No bare @Cron in multi-pod**: Use distributed locking (redlock) to prevent duplicate concurrent runs.
