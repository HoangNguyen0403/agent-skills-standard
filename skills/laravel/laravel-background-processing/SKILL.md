---
name: laravel-background-processing
description: "Scalable asynchronous workflows using Queues, Jobs, and Events. Use when implementing queued jobs, event-driven workflows, or async processing in Laravel. (triggers: app/Jobs/**/*.php, app/Events/**/*.php, app/Listeners/**/*.php, ShouldQueue, dispatch, batch, chain, listener)"
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

- **No heavy logic in request path**: Defer tasks >100ms to Queues.
- **No full model in job payload**: Pass IDs; Eloquent fetches on run.
- **No deep event listener chains**: Keep listener depth shallow.
- **No unmonitored queues**: Configure retries and Horizon alerts.

## References

- [Job Chaining & Event Patterns](references/implementation.md)
