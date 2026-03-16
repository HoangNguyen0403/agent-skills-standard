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
