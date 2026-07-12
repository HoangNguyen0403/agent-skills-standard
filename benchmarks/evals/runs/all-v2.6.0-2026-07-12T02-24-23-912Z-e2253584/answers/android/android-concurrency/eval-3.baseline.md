Use `StateFlow` for observable state and `SharedFlow` for events or other broadcasts.

`StateFlow` always has a current value and immediately gives a new collector the latest value. It is a good fit for a `ViewModel` UI model, such as loading, content, and error state:

```kotlin
private val _uiState = MutableStateFlow(UiState())
val uiState: StateFlow<UiState> = _uiState.asStateFlow()
```

`SharedFlow` does not require an initial value and is configurable for replay and buffering. Use it for one-off or transient events such as navigation, a snackbar, or a toast:

```kotlin
private val _events = MutableSharedFlow<UiEvent>()
val events: SharedFlow<UiEvent> = _events.asSharedFlow()
```

A `SharedFlow` event can be missed if no collector is active, so do not use it for state that must be recoverable; represent that information in `StateFlow` or persistent storage instead. Collect either flow from the UI with lifecycle-aware collection (for example, `repeatOnLifecycle`). Avoid using `StateFlow` for one-time events, since its current value and replay behavior can cause an event to be handled again after recreation.

