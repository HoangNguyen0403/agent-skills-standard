---
name: android-state
description: "Configure ViewModel state emission with StateFlow, sealed UiState classes, and lifecycle-safe collection in Android. Use when working with ViewModel files, UiState sealed classes, MutableStateFlow, collectAsStateWithLifecycle, or exposing state from ViewModels. (triggers: **/*ViewModel.kt, **/*UiState.kt, viewmodel, stateflow, livedata, uistate, MutableStateFlow, collectAsState, viewModelScope, UiState)"
---

# Android State Management

## **Priority: P0**

## 1. Structure the ViewModel

- Expose ONE `StateFlow<UiState>` via `.asStateFlow()`.
- Use `viewModelScope` for all coroutines.
- Trigger initial load in `init` block.

See [templates](references/implementation.md) for ViewModel and UiState examples.

## 2. Define UI State (LCE Pattern)

- Use sealed interface with Loading, Content, Error variants.
- Data classes inside should be `@Immutable`.

See [templates](references/implementation.md) for sealed UiState pattern.

## 3. Collect State Lifecycle-Safely

- Use `collectAsStateWithLifecycle()` in Compose.
- Use `SharingStarted.WhileSubscribed(5000)` for shared resources.

## Anti-Patterns

- **No LiveData for New Code**: Use StateFlow — lifecycle-safe and Compose-compatible.
- **No Public MutableStateFlow**: Expose only `.asStateFlow()` to consumers.
- **No Context in ViewModel**: Leaks Activity. Use Application context if truly needed.

## References

- [Templates](references/implementation.md)
