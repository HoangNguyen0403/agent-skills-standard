Don’t fire off bare goroutines in the loop. Give each one a defined lifetime and a shutdown path.

The usual pattern is:

- pass a `context.Context` into the work
- capture the loop variable correctly
- use `errgroup` or a `sync.WaitGroup` to track completion
- use `select` on `ctx.Done()` inside long-running or blocking work
- close channels from the producer side only, so consumers can exit cleanly

Example with `errgroup`:

```go
func processOrders(ctx context.Context, orders []Order) error {
	g, ctx := errgroup.WithContext(ctx)

	for _, order := range orders {
		order := order // capture loop variable

		g.Go(func() error {
			return handleOrder(ctx, order)
		})
	}

	return g.Wait()
}

func handleOrder(ctx context.Context, order Order) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := doStep(ctx, order); err != nil {
			return err
		}

		return nil
	}
}
```

If the goroutine reads from a channel, make sure it can stop when either:

- the channel is closed, or
- the context is canceled

Example:

```go
func worker(ctx context.Context, jobs <-chan Order) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case job, ok := <-jobs:
			if !ok {
				return nil
			}
			if err := process(job); err != nil {
				return err
			}
		}
	}
}
```

Big rule: never start a goroutine unless you can answer “how does it stop?”

And after that, verify with:

```bash
go test -race ./...
```

