---
name: nestjs-scheduling
description: "Implement distributed cron jobs with Redis-based locking and BullMQ offloading in NestJS. Use when adding @Cron scheduled tasks, preventing duplicate runs across pods, or delegating heavy work to queue workers. (triggers: **/*.service.ts, @Cron, CronExpression, ScheduleModule)"
---

# Task Scheduling & Jobs

## **Priority: P1 (OPERATIONAL)**

Background job processing and scheduled task patterns.

## Workflow: Add a Scheduled Task

1. **Register ScheduleModule** — Import `ScheduleModule.forRoot()` in AppModule.
2. **Create cron handler** — Decorate a service method with `@Cron(CronExpression.*)`.
3. **Add distributed lock** — Apply a Redis lock decorator to prevent multi-pod duplication.
4. **Offload heavy work** — Push job IDs to BullMQ; let workers process them.
5. **Wrap in try/catch** — Uncaught exceptions in cron handlers crash the entire Node process.
6. **Verify** — Test with 2+ instances to confirm only one acquires the lock.

## Problem & Solution

- **Problem**: `@Cron()` runs on **every** instance. In K8s with 3 pods, your "Daily Report" runs 3 times.
- **Solution**: **Distributed Locking** using Redis.
  - **Pattern**: Using a decorator to wrap the cron method.
  - **Logic**: `SET resource_name my_random_value NX PX 30000` (Redis Atomic Set).

## Cron Decorator Pattern

- **Implementation**:

  See [implementation examples](references/example.md)

- **Tools**: Use `nestjs-redlock` or custom Redis wrapper via `redlock` library.

## Cron-to-Queue Offload

See [implementation examples](references/example.md)

## Job Robustness

- **Isolation**: Never perform heavy processing inside the Cron handler.
  - **Pattern**: Cron -> Push Job ID to Queue (BullMQ) -> Worker processes it.
  - **Why**: Cron schedulers can get blocked by the Event Loop; Workers are scalable.
- **Error Handling**: Wrap ALL cron logic in `try/catch`. Uncaught exceptions in a Cron job can crash the entire Node process.


## Anti-Patterns

- **No unguarded cron logic**: Always wrap in `try/catch`; uncaught exceptions crash the entire Node process.
- **No direct cron processing**: Push to BullMQ queue; workers are scalable, cron handlers are not.
- **No bare @Cron in multi-pod**: Use distributed locking (redlock) to prevent duplicate concurrent runs.
