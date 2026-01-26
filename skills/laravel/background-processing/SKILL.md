---
name: Laravel Background Processing
description: Scalable asynchronous workflows using Queues, Jobs, and Events.
metadata:
  labels: [laravel, queue, job, events, horizon]
  triggers:
    files:
      ['app/Jobs/**/*.php', 'app/Events/**/*.php', 'app/Listeners/**/*.php']
    keywords: [ShouldQueue, dispatch, batch, chain, listener]
---

# Laravel Background Processing

## **Priority: P1 (HIGH)**

## Structure

```text
app/
├── Jobs/               # Asynchronous tasks
├── Events/             # Communication flags
└── Listeners/          # Task reactions
```

## Implementation Guidelines

- **Offload Heavy Tasks**: Move any logic taking >100ms to a Queued Job.
- **ShouldQueue Interface**: Add to Listeners for transparent async execution.
- **Redis Driver**: Use Redis for reliable and high-throughput queuing.
- **Job Chaining**: Use `Bus::chain()` for dependent sequential jobs.
- **Job Batching**: Use `Bus::batch()` for parallel task monitoring.
- **Failures**: Define `failed()` method in jobs to handle permanent errors.
- **Monitoring**: Use **Laravel Horizon** for real-time queue observability.

## Anti-Patterns

- **Blocking UX**: **No heavy logic in Request path**: Always defer to Queues.
- **Raw Models**: **No large job payloads**: Pass model IDs, not full objects.
- **Implicit Flow**: **No deep event-loop logic**: Keep listener chains shallow.
- **Silent Failures**: **No unmonitored queues**: Ensure retries and alerts.

## References

- [Job Chaining & Event Patterns](references/implementation.md)
