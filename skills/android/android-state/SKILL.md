---
name: android-state
description: "Standards for ViewModel, StateFlow, and UI State Patterns. Use when managing UI state with ViewModel, StateFlow, or UiState in Android. (triggers: **/*ViewModel.kt, **/*UiState.kt, viewmodel, stateflow, livedata, uistate)"
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

- **LiveData**: `**No LiveData**: Use StateFlow.`
- **Mutable State**: `**No Mutable Public**: Expose read-only Flow.`
- **Context**: `**No Context in VM**: Memory Leak Risk.`

## References

- [Templates](references/implementation.md)
