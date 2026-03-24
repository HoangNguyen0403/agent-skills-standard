# State Management Implementation

## Safe ViewModel Template

```kotlin
@HiltViewModel
class FeedViewModel @Inject constructor(
    private val getFeedUseCase: GetFeedUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow<FeedUiState>(FeedUiState.Loading)
    val uiState = _uiState.asStateFlow()

    init {
        loadFeed()
    }

    fun loadFeed() {
        viewModelScope.launch {
            getFeedUseCase()
               .onStart { _uiState.value = FeedUiState.Loading }
               .catch { _uiState.value = FeedUiState.Error(it.message) }
               .collect { _uiState.value = FeedUiState.Success(it) }
        }
    }
}
```

## UI State Contract

```kotlin
@Immutable
sealed interface FeedUiState {
    data object Loading : FeedUiState
    data class Success(val items: ImmutableList<Post>) : FeedUiState
    data class Error(val msg: String?) : FeedUiState
}
```

## One-Time Events (Anti-Pattern Fix)

Do not use `SharedFlow` for Navigation. Use State (`navTarget`) inside UiState and consume it in the UI (handle & reset).

## ProfileViewModel Example

```kotlin
class ProfileViewModel @Inject constructor(
    private val getUserUseCase: GetUserUseCase
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            _uiState.value = try {
                UiState.Content(getUserUseCase())
            } catch (e: Exception) {
                UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}
```

## Sealed UiState (LCE Pattern)

```kotlin
sealed interface UiState {
    data object Loading : UiState
    @Immutable data class Content(val user: User) : UiState
    data class Error(val message: String) : UiState
}
```
