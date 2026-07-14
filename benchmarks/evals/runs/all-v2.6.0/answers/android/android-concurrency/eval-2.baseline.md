Inject the dispatcher needed by the class instead of calling `Dispatchers.IO` or `Dispatchers.Default` directly. Usually a small dispatcher provider keeps production wiring and tests simple:

```kotlin
interface AppDispatchers {
    val io: CoroutineDispatcher
    val default: CoroutineDispatcher
}

class DefaultAppDispatchers : AppDispatchers {
    override val io = Dispatchers.IO
    override val default = Dispatchers.Default
}

class UserViewModel(
    private val repository: UserRepository,
    private val dispatchers: AppDispatchers,
) : ViewModel() {
    fun load() = viewModelScope.launch {
        val user = withContext(dispatchers.io) {
            repository.loadUser()
        }
        // Publish the result as UI state.
    }
}
```

In a test, provide `StandardTestDispatcher` (often the same test dispatcher for every field) and run the code inside `runTest`, then call `advanceUntilIdle()` when needed. If the code uses `viewModelScope`, its built-in `Dispatchers.Main` also needs to be replaced with `Dispatchers.setMain(testDispatcher)` and restored with `Dispatchers.resetMain()` in setup/teardown. Inject `CoroutineDispatcher`, not a test-only dispatcher type, in production APIs.

