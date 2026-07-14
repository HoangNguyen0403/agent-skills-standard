Prefer not to have multiple goroutines mutate the counter directly. The idiomatic Go approach is to send increment events over a channel to a single owner goroutine that updates the counter, which avoids races.

If shared mutation is unavoidable, protect the counter with `sync.Mutex` or use `sync/atomic` for simple numeric increments.

