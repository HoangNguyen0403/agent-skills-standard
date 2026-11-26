---
name: kotlin-coroutines
description: Write safe, structured concurrent code with Kotlin Coroutines. Use for suspend functions, coroutine scopes, cancellation, and coroutine leaks; defer Java Virtual Threads, Android WorkManager/Fragment lifecycle, Compose state hoisting, and Detekt/tooling configuration.
metadata:
  triggers:
    files:
    - '**/*.kt'
    keywords:
    - suspend
    - CoroutineScope
    - launch
    - async
    - Flow
    - StateFlow
    - SharedFlow
    - viewModelScope
    - GlobalScope
    - Dispatchers
    - isActive
    - yield
    - runBlocking
---
# Kotlin Coroutines Expert

## **Priority: P0 (CRITICAL)**

**Role**: Concurrency Expert. Prioritize safety and cancellation support.

## Implementation Guidelines

- **Scope**: Use `viewModelScope` (Android) or structured `coroutineScope`.
- **Dispatchers**: Inject dispatchers; never hardcode `Dispatchers.IO`.
- **Flow**: Use `StateFlow` for state, `SharedFlow` for events.
- **Exceptions**: `runCatching` and `CoroutineExceptionHandler` are not interchangeable recovery. `runCatching` catches `CancellationException` too — rethrow it before mapping a failure. `CoroutineExceptionHandler` only reports uncaught failures of root `launch` coroutines.

## Concurrency Checklist (Mandatory)

- [ ] **Cancellation**: loops check `isActive` or call `yield()`? Cancellation is rethrown, never mapped to an error state?
- [ ] **Structured**: No `GlobalScope`? All children joined/awaited?
- [ ] **Context**: `Dispatchers.Main` used for UI updates?
- [ ] **Leaks**: scopes cancelled in `onCleared` / `onDestroy`?

## Anti-Patterns

- **No GlobalScope**: It leaks. Use structured concurrency.
- **No Swallowed Cancellation**: Never convert `CancellationException` into an error state, log-and-continue, or swallow it in `runCatching`; rethrow after cleanup (or call `ensureActive()`).
- **No Async without Await**: Don't `async { ... }` without `await()`.
- **No Blocking**: Never `runBlocking` in prod code (only tests).

## References

- [Advanced Patterns & Flow Examples](references/advanced-patterns.md)
