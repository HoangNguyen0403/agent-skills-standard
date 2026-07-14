Model the screen as one sealed `UiState` using the loading/content/error
(LCE) variants. Make state data immutable so Compose can reason about it
reliably:

```kotlin
@Immutable
sealed interface FeedUiState {
    data object Loading : FeedUiState

    @Immutable
    data class Content(val items: ImmutableList<Post>) : FeedUiState

    @Immutable
    data class Error(val message: String?) : FeedUiState
}

class FeedViewModel(
    private val getFeed: GetFeedUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow<FeedUiState>(FeedUiState.Loading)
    val uiState = _uiState.asStateFlow()

    init {
        loadFeed()
    }

    fun loadFeed() {
        viewModelScope.launch {
            getFeed()
                .onStart { _uiState.value = FeedUiState.Loading }
                .catch { error ->
                    _uiState.value = FeedUiState.Error(error.message)
                }
                .collect { items ->
                    _uiState.value = FeedUiState.Content(items)
                }
        }
    }
}
```

Expose the private `MutableStateFlow` only through `asStateFlow()`, trigger the
initial load in `init`, and perform loading and state transitions in
`viewModelScope`. The UI renders each sealed branch; it should not use
`LiveData` for this new state contract or maintain separate competing flows for
loading, data, and errors.

