Treat goroutines like owned work with a clear shutdown path.

- Pass a `context.Context` into each worker and make the goroutine `select` on `ctx.Done()` anywhere it may block.
- Close or drain channels deliberately. A goroutine waiting forever on send/receive is the classic leak.
- Use `sync.WaitGroup` so the parent waits for all spawned goroutines to exit.
- Bound concurrency with a worker pool or semaphore instead of unbounded `go` calls in a loop.
- Be careful with loop variables: capture them per iteration (`order := order`) before starting the goroutine.
- Ensure I/O has deadlines or respects context cancellation.

Example:

```go
var wg sync.WaitGroup
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

for _, order := range orders {
    order := order
    wg.Add(1)
    go func() {
        defer wg.Done()

        select {
        case <-ctx.Done():
            return
        default:
        }

        processOrder(ctx, order)
    }()
}

wg.Wait()
```

If you want stronger guarantees, `errgroup.WithContext` is often cleaner than a raw `WaitGroup` because it ties cancellation and waiting together.

