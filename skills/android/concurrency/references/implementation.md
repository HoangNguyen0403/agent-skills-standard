# Concurrency Implementation (Coroutines)

## Dispatcher Injection Pattern

```kotlin
// Define Interface
interface DispatcherProvider {
    val main: CoroutineDispatcher
    val io: CoroutineDispatcher
    val default: CoroutineDispatcher
}

// Implementation
class DefaultDispatcherProvider @Inject constructor() : DispatcherProvider {
    override val main: CoroutineDispatcher = Dispatchers.Main
    override val io: CoroutineDispatcher = Dispatchers.IO
    override val default: CoroutineDispatcher = Dispatchers.Default
}

// Usage in ViewModel
@HiltViewModel
class MyViewModel @Inject constructor(
    private val dispatchers: DispatcherProvider
) : ViewModel() {
    fun doWork() {
        viewModelScope.launch(dispatchers.io) {
            // Background work
        }
    }
}
```

## Exception Handling

```kotlin
val handler = CoroutineExceptionHandler { _, exception ->
    Timber.e(exception, "Coroutine failed")
}

viewModelScope.launch(handler) {
    // Risky code
}
```
