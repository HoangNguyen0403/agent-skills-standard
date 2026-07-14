Inject a `CoroutineDispatcher` (or a small dispatcher-provider abstraction) at the boundary that chooses execution context:

```kotlin
class UserRepository(
    private val io: CoroutineDispatcher = Dispatchers.IO,
) {
    suspend fun load(): User = withContext(io) { api.load() }
}
```

In production, pass `Dispatchers.IO`. In a unit test, pass a `StandardTestDispatcher` and run the test with `runTest`, so virtual time and queued work are deterministic. Avoid hard-coding dispatchers in the class under test. Inject a scope separately when ownership of launched work is part of the component's responsibility.
