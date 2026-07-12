Keep the mutable flow private and expose a read-only `StateFlow`:

```kotlin
private val _uiState = MutableStateFlow(UiState())
val uiState: StateFlow<UiState> = _uiState.asStateFlow()
```

Update `_uiState` inside the `ViewModel`, preferably with `update { ... }` when the new value depends on the old one. Consumers can collect `uiState` but cannot emit arbitrary values, preserving the `ViewModel`'s state ownership. Also cancel collection with the appropriate lifecycle-aware API, such as `repeatOnLifecycle` in a UI layer.
