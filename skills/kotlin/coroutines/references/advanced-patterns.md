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

            // withContext for main-safety
            val result = runCatching {
                withContext(dispatcher) {
                    repo.fetchUser(userId)
                }
            }

            result.onSuccess { user ->
                _uiState.value = UiState.Success(user)
            }.onFailure { e ->
                _uiState.value = UiState.Error(e.message ?: "Unknown Error")
            }
        }
    }
}
```

## Parallel Execution with Async

Only use `async` when multiple independent sources need to be fetched.

```kotlin
suspend fun fetchDashboardData() = coroutineScope {
    val user = async { repo.fetchUser() }
    val orders = async { repo.fetchOrders() }

    DashboardData(user.await(), orders.await())
}
```
