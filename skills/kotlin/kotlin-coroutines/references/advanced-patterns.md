# Kotlin Advanced Coroutines & Flow

## ViewModel Implementation Pattern

Standard pattern for combining Structured Concurrency with StateFlow in Android/General ViewModels.

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

class UserViewModel(
    private val repo: UserRepository,
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun loadUser(userId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading

            try {
                // withContext for main-safety
                val user = withContext(dispatcher) { repo.fetchUser(userId) }
                _uiState.value = UiState.Success(user)
            } catch (e: CancellationException) {
                throw e // cancellation must stay observable to the scope
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message ?: "Unknown Error")
            }
        }
    }
}
```

`runCatching` is fine only when cancellation is rethrown before mapping: `runCatching { ... }.onFailure { if (it is CancellationException) throw it }`. A `CoroutineExceptionHandler` sees uncaught failures of root `launch` coroutines only; it is not local recovery.

## Cancellation Propagation with runCatching

```kotlin
suspend fun loadProfile(id: String): Profile? =
    runCatching { repo.fetchProfile(id) }
        .onFailure { if (it is CancellationException) throw it }  // cancellation stays observable
        .getOrNull()                                              // genuine failure → null
```

`runCatching` collapses every non-cancellation failure into `Result`; prefer an explicit `try`/`catch` when you need to map exception types individually.

## Parallel Execution with Async

Only use `async` when multiple independent sources need to be fetched.

```kotlin
suspend fun fetchDashboardData() = coroutineScope {
    val user = async { repo.fetchUser() }
    val orders = async { repo.fetchOrders() }

    DashboardData(user.await(), orders.await())
}
```
