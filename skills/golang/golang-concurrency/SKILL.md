---
name: golang-concurrency
description: Write safe concurrent Go code with goroutines, channels, and context. Use when implementing concurrency with goroutines, channels, or context in Go.
metadata:
  triggers:
    keywords:
    - goroutine
    - go keyword
    - channel
    - mutex
    - waitgroup
    - context
    - errgroup
    - race condition
---
# Golang Concurrency

## **Priority: P0 (CRITICAL)**

## Principles

- **Share Memory by Communicating**: Use channels or synchronization primitives instead of unprotected shared memory.
- **Context Propagation**: Always pass `ctx` to manage cancellation, deadlines, and graceful termination.
- **Throttle Database Load**: Reserve goroutines for independent external API calls or CPU work. **Avoid unconstrained goroutines hitting databases** to prevent connection pool exhaustion.
- **Prevent Leaks**: Never start a goroutine without a deterministic shutdown mechanism.
- **Race Detection**: Always verify concurrent code with `go test -race`.

## Implementation Workflow

1. **Choose primitive** — `errgroup.Group` for parallel tasks with error propagation, channels for pipelines, `sync.Mutex` for simple shared state.
2. **Bound Concurrency with Semaphore** — Cap maximum active goroutines using a buffered channel semaphore:
   ```go
   sem := make(chan struct{}, maxWorkers)
   for _, task := range tasks {
       task := task // prevent loop pointer capture
       sem <- struct{}{}
       g.Go(func() error {
           defer func() { <-sem }()
           return task.Execute(ctx)
       })
   }
   ```
3. **Respect Context Cancellation** — Goroutines performing I/O must honor `ctx.Done()`.
4. **Avoid Loop Pointer Capture** — Capture iteration variables explicitly before launching goroutines.
5. **Test with race detector** — Run `go test -race` in local dev and CI.

See [ErrGroup and concurrency patterns](references/concurrency-patterns.md) and [context timeout examples](references/context-usage.md)

## Anti-Patterns

- **No DB connection spam**: avoid spawning unbounded goroutines to query the database in parallel.
- **No goroutine leaks**: ensure every goroutine has an exit path via `ctx.Done()` or channel closure.
- **No loop variable pointer trap**: never pass the address of a loop variable (`&item`) into a concurrent closure.
- **No unbuffered goroutine spawn storms**: always cap concurrency with worker pools or semaphores.
- **No bare goroutines**: use `errgroup` or `sync.WaitGroup` for lifecycle tracking.

## References

- [Concurrency Patterns](references/concurrency-patterns.md)
- [Context Usage](references/context-usage.md)