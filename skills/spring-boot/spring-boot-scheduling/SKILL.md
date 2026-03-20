---
name: spring-boot-scheduling
description: "Standards for scheduled tasks and distributed locking with ShedLock. Use when implementing @Scheduled tasks or distributed locking with ShedLock in Spring Boot. (triggers: **/*Scheduler.java, **/*Job.java, scheduled, shedlock, cron)"
---

# Spring Boot Scheduling Standards

## **Priority: P0**

## Implementation Guidelines

### Scheduled Tasks

- **ThreadPool**: ALWAYS configure a dedicated `TaskScheduler` (default is 1 thread).
- **Async**: Keep `@Scheduled` methods light; offload to `@Async`/Queues.

### Distributed Locking (ShedLock)

- **Problem**: `@Scheduled` runs on ALL pods in K8s.
- **Solution**: Use **ShedLock** to guarantee single execution.
- **Config**: Set `lockAtMostFor` (deadlock safety) and `lockAtLeastFor` (debounce).

## Anti-Patterns

- **No Default Pool**: Configure dedicated TaskScheduler (default is 1 thread).
- **No duplicates**: Use ShedLock for distributed cron in multi-pod deployments.
- **No task state**: Design tasks to be idempotent; assume pod can restart.

## References

- [Implementation Examples](references/implementation.md)
