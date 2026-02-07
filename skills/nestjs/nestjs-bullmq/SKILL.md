---
name: NestJS BullMQ Implementation
description: Standard workflow for implementing background jobs using BullMQ in NestJS.
metadata:
  labels: [nestjs, bullmq, background-jobs, queue, redis]
  triggers:
    files: ['package.json', '**/*.module.ts']
    keywords: [queue, backlog, background job, async task, worker]
---

# NestJS BullMQ Implementation

## **Priority: P0 (Standard)**

Implement type-safe, robust background jobs using the `Producer-Consumer` pattern with `@nestjs/bullmq`.

## Structure

```text
src/modules/{feature}/
├── {feature}-queue.service.ts  # Producer: Schedules jobs
├── {feature}.processor.ts      # Consumer: Processes jobs
└── {feature}.module.ts         # Config: Registers queues
```

## Implementation Guidelines

- **Use Producers**: create a dedicated `QueueService` to wrap `queue.add()`.
- **Use Consumers**: extend `WorkerHost` and decorate with `@Processor(QUEUE_NAME)`.
- **Enforce Types**: Define interfaces for `JobData` to ensure payload safety.
- **Manage Lifecycle**: Set `removeOnComplete: true` to prevent Redis memory bloat.
- **Handle Errors**: Use `removeOnFail` limit or Dead Letter Queues (DLQ) for debugging.
- **Unique IDs**: Provide deterministic `jobId` if you need to cancel/deduplicate jobs later.

## Anti-Patterns

- **No Strings**: Define queue names as constants, not inline strings.
- **No Heavy Logic**: Do not put complex business logic in `QueueService`; only schedule.
- **Avoid Implicit cleanup**: Always configure job cleanup policies explicitly.
- **No Direct Redis**: Use `InjectQueue` annotations, avoided raw Redis commands.

## Reference & Examples

For complete code patterns: [references/patterns.md](references/patterns.md)
