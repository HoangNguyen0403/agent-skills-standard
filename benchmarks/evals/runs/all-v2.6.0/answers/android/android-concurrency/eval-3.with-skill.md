Use `StateFlow` for persistent UI state and `SharedFlow` for one-off events.

`StateFlow` always has a current value and replays the latest state to a new subscriber:

```kotlin
private val _uiState = MutableStateFlow(UiState())
val uiState: StateFlow<UiState> = _uiState.asStateFlow()
```

Use it for loading, content, and error state that the UI should be able to render after recreation.

`SharedFlow` is appropriate for events such as navigation, a snackbar, or a toast:

```kotlin
private val _events = MutableSharedFlow<UiEvent>()
val events: SharedFlow<UiEvent> = _events.asSharedFlow()
```

Configure `replay` only when late subscribers must receive a recent event. Do not use `SharedFlow` as a substitute for state that needs a current value.

Collect flows with lifecycle awareness: use `collectAsStateWithLifecycle()` in Compose or collect inside `repeatOnLifecycle` in Views.

