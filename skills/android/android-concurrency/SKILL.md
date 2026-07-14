---
name: android-concurrency
description: Write correct coroutine scopes, lifecycle collection, and dispatcher injection in Android production code. Use for suspend functions, coroutine scopes, and dispatcher mechanics; defer ViewModel StateFlow/LiveData architecture, Fragment lifecycle recipes, persistence/notifications, and unit-test recipes to their specific skills.
metadata:
  triggers:
    files:
    - '**/*ViewModel.kt'
    - '**/*UseCase.kt'
    - '**/*Repository.kt'
    keywords:
    - suspend
    - viewModelScope
    - lifecycleScope
    - Flow
    - coroutine
    - Dispatcher
    - DispatcherProvider
    - GlobalScope
---
# Android Concurrency Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Structured Concurrency

- **Scopes**: Always use `viewModelScope` (VM) or `lifecycleScope` (Activity/Fragment).
- **Dispatchers**: INJECT Dispatchers (`DispatcherProvider`) for testability. not hardcode `Dispatchers.IO`.

### Flow usage

- **Cold Streams**: Use `Flow` for data streams.
- **Hot Streams**: Use `StateFlow` (State) or `SharedFlow` (Events).
- **Replay**: Use `SharedFlow` with `replay` only when late subscribers must receive recent events.
- **Collection**: Use `collectAsStateWithLifecycle()` (Compose) or `repeatOnLifecycle` (Views).

## Anti-Patterns

- **No GlobalScope**: Use viewModelScope or lifecycleScope — never GlobalScope.
- **No async/await by default**: Prefer simple suspend functions; async only for parallel calls.

## References

- [Dispatcher Pattern](references/implementation.md)


## Canonical response anchors

- Additional task-grounded exact anchors: hardcode
