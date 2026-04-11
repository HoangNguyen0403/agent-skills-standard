---
name: android-concurrency
description: "Standards for Coroutines, Flow, and Threading. Use when writing suspend functions, choosing coroutine scopes, switching between StateFlow and SharedFlow, injecting Dispatchers for testability, or debugging threading issues in Android. (triggers: **/*ViewModel.kt, **/*UseCase.kt, **/*Repository.kt, suspend, viewModelScope, lifecycleScope, Flow, coroutine, Dispatcher, DispatcherProvider, GlobalScope)"
---
# Android Concurrency Standards

## **Priority: P0**

## Implementation Guidelines

### Structured Concurrency

- **Scopes**: Always use `viewModelScope` (VM) or `lifecycleScope` (Activity/Fragment).
- **Dispatchers**: INJECT Dispatchers (`DispatcherProvider`) for testability. not hardcode `Dispatchers.IO`.

### Flow usage

- **Cold Streams**: Use `Flow` for data streams.
- **Hot Streams**: Use `StateFlow` (State) or `SharedFlow` (Events).
- **Collection**: Use `collectAsStateWithLifecycle()` (Compose) or `repeatOnLifecycle` (Views).

## Anti-Patterns

- **No GlobalScope**: Use viewModelScope or lifecycleScope — never GlobalScope.
- **No async/await by default**: Prefer simple suspend functions; async only for parallel calls.

## References

- [Dispatcher Pattern](references/implementation.md)