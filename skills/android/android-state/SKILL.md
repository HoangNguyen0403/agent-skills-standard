---
name: android-state
description: "Standards for ViewModel, StateFlow, and UI State Patterns. Use whenever someone works with ViewModel files, asks about UiState sealed classes, MutableStateFlow vs LiveData, collectAsStateWithLifecycle, viewModelScope, or exposing state from Android ViewModels — even indirectly. (triggers: **/*ViewModel.kt, **/*UiState.kt, viewmodel, stateflow, livedata, uistate, MutableStateFlow, collectAsState, viewModelScope, UiState)"
---

# Android State Management

## **Priority: P0**

## Implementation Guidelines

### ViewModel Pattern

- **Exposure**: Expose ONE `StateFlow<UiState>` via `.asStateFlow()`.
- **Scope**: Use `viewModelScope` for all coroutines.
- **Initialization**: Trigger initial load in `init` or `LaunchedEffect` (once).

### UI State (LCE)

- **Type**: sealed interface `UiState` (Loading, Content, Error).
- **Immutability**: Data classes inside should be `@Immutable`.

### Flow Lifecycle

- **Collection**: Use `collectAsStateWithLifecycle()` in Compose.
- **Hot Flows**: Use `SharingStarted.WhileSubscribed(5000)` for shared resources.

## Anti-Patterns

- **No LiveData for New Code**: Use StateFlow — lifecycle-safe and Compose-compatible.
- **No Public MutableStateFlow**: Expose only `.asStateFlow()` to consumers.
- **No Context in ViewModel**: Leaks Activity. Use Application context if truly needed.

## References

- [Templates](references/implementation.md)
