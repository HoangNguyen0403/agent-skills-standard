No. The `ViewModel` should own all state mutations; exposing a public
`MutableStateFlow` allows the UI (or any consumer) to bypass that ownership and
write invalid state directly.

Keep the mutable flow private and expose exactly one read-only flow:

```kotlin
private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
val uiState: StateFlow<UiState> = _uiState.asStateFlow()
```

The UI should send intent-style calls such as `viewModel.retry()` or
`viewModel.onQueryChanged(query)`. The `ViewModel` performs the update from its
`viewModelScope` coroutine. This keeps transitions in one place and makes the
screen unable to mutate the state contract directly. For new code, use
`StateFlow` rather than `LiveData`; do not put an `Activity` context in the
`ViewModel`.

