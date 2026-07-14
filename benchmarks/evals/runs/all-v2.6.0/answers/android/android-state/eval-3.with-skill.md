Collect the `ViewModel`'s single `StateFlow<UiState>` with the lifecycle-aware
Compose API:

```kotlin
@Composable
fun FeedRoute(viewModel: FeedViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when (val state = uiState) {
        FeedUiState.Loading -> LoadingContent()
        is FeedUiState.Content -> FeedContent(items = state.items)
        is FeedUiState.Error -> ErrorContent(
            message = state.message,
            onRetry = viewModel::loadFeed,
        )
    }
}
```

`collectAsStateWithLifecycle()` starts and stops collection with the UI
lifecycle, avoiding work while the screen is not active. Keep the exposed flow
read-only (`private MutableStateFlow` plus `asStateFlow()`) and render the
sealed loading/content/error state declaratively. If the flow is shared from a
costly upstream resource, configure sharing with
`SharingStarted.WhileSubscribed(5000)` so it can stop after subscribers leave.

