# Context Usage

**Golden Rule**: `func Foo(ctx context.Context, args ...)` - First parameter.

## Timeout/Deadline

Stop work if it takes too long.

```go
func slowOperation() {
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    select {
    case <-time.After(1 * time.Second):
        fmt.Println("overslept")
    case <-ctx.Done():
        fmt.Println(ctx.Err()) // prints "context deadline exceeded"
    }
}
```

## Cancellation

Propagate cancel signal down the call graph.

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())

    go func() {
        // Do work, check ctx.Done() frequently
        if err := doWork(ctx); err != nil {
            cancel() // Cancel everyone else
        }
    }()
}
```
