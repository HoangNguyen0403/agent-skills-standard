Represent the screen as one observable UI state instead of exposing separate, independently mutable `isLoading`, `data`, and `error` flags. A sealed hierarchy makes invalid combinations—for example, loading and error at the same time—harder to express.

```kotlin
sealed interface UserUiState {
    data object Loading : UserUiState
    data class Success(val users: List<User>) : UserUiState
    data class Error(
        val message: String,
        val canRetry: Boolean = true
    ) : UserUiState
}

class UserViewModel(
    private val repository: UserRepository
) : ViewModel() {
    private val _uiState = MutableStateFlow<UserUiState>(UserUiState.Loading)
    val uiState: StateFlow<UserUiState> = _uiState.asStateFlow()

    init {
        loadUsers()
    }

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.value = UserUiState.Loading
            try {
                val users = repository.loadUsers()
                _uiState.value = UserUiState.Success(users)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Exception) {
                _uiState.value = UserUiState.Error(
                    message = messageFor(failure)
                )
            }
        }
    }
}
```

The Compose screen renders each state explicitly: show a progress indicator for `Loading`, content for `Success`, and an error message plus retry action for `Error`. Map exceptions to user-facing messages in the `ViewModel` or a presentation mapper; do not make the UI interpret arbitrary exception types.

If refreshing should retain already displayed data, use a richer state such as `data class Content(val users: List<User>, val isRefreshing: Boolean, val error: String? = null)` rather than replacing content with a blank loading state. One-shot effects such as a snackbar or navigation event should normally use a separate `SharedFlow` or `Channel`, because a `StateFlow` replays its latest value and may repeat an effect after recreation. Also avoid swallowing `CancellationException`, and ensure overlapping loads are cancelled or coordinated according to the desired behavior.

