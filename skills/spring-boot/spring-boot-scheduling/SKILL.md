---
name: spring-boot-scheduling
description: Configure scheduled tasks and distributed locking with ShedLock in Spring Boot. Use when implementing @Scheduled tasks or distributed locking with ShedLock in Spring Boot.
metadata:
  triggers:
    files:
    - '**/*Scheduler.java'
    - '**/*Job.java'
    keywords:
    - scheduled
    - shedlock
    - cron
---
# Spring Boot Scheduling Standards

## **Priority: P0**

## Configure Scheduled Tasks

- **ThreadPool**: ALWAYS configure dedicated `TaskScheduler` (default 1 thread). Enable with `@EnableScheduling` annotation.
- **Async**: Keep `@Scheduled` methods light; offload to `@Async`/Queues. Wrap logic in try/catch; log errors and use `@Retryable` for retry on transient failures.

## Lock Tasks with ShedLock

- **Problem**: `@Scheduled` runs on ALL pods in K8s.
- **Solution**: Use **ShedLock** to guarantee single execution.
- **Config**: Set `lockAtMostFor` (deadlock safety) and `lockAtLeastFor` (debounce).

See [implementation examples](references/implementation.md) for ShedLock distributed task configuration and scheduler pool setup.

## Anti-Patterns

- **No Default Pool**: Configure dedicated TaskScheduler (default 1 thread).
- **No duplicates**: Use ShedLock for distributed cron in multi-pod deployments.
- **No task state**: Design tasks to idempotent; assume pod can restart.

## References

- [Implementation Examples](references/implementation.md)