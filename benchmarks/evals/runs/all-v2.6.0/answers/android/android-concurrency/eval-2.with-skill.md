Inject a dispatcher provider instead of referencing `Dispatchers.IO` or another concrete dispatcher directly.

```kotlin
interface DispatcherProvider {
    val main: CoroutineDispatcher
    val io: CoroutineDispatcher
    val default: CoroutineDispatcher
}

object DefaultDispatcherProvider : DispatcherProvider {
    override val main = Dispatchers.Main
    override val io = Dispatchers.IO
    override val default = Dispatchers.Default
}

class ItemsRepository(
    private val dispatchers: DispatcherProvider,
) {
    suspend fun loadItems(): List<Item> = withContext(dispatchers.io) {
        api.fetchItems()
    }
}
```

Provide `DefaultDispatcherProvider` in production and a test implementation backed by `StandardTestDispatcher` in `runTest`:

```kotlin
@Test
fun loadsItems() = runTest {
    val testDispatchers = object : DispatcherProvider {
        override val main = StandardTestDispatcher(testScheduler)
        override val io = StandardTestDispatcher(testScheduler)
        override val default = StandardTestDispatcher(testScheduler)
    }

    val repository = ItemsRepository(testDispatchers)
    // invoke the code under test, then advanceUntilIdle() as needed
}
```

This keeps coroutine scheduling deterministic and lets tests control execution without changing production code.

