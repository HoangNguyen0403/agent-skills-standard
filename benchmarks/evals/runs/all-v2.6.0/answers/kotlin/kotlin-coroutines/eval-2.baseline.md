Make the loop cooperative with cancellation. A common pattern is:

```kotlin
while (isActive) {
    doUnitOfWork()
    yield() // or use a cancellable suspending operation
}
```

`isActive`, `ensureActive()`, and `yield()` allow a CPU-bound loop to observe cancellation. Most standard suspending functions are already cancellable, but a blocking call should be moved to an appropriate dispatcher or made interruptible. Do not catch `CancellationException` and swallow it; rethrow it (or avoid catching it) so cancellation propagates. Use `finally` for cleanup.
