---
name: kotlin-coroutines
description: Write safe, structured concurrent code with Kotlin Coroutines. Use when writing suspend functions, choosing coroutine scopes, handling cancellation in loops, selecting between StateFlow and SharedFlow, debugging coroutine leaks, or asked why GlobalScope is dangerous.
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
- **Exceptions**: Use `runCatching` or `CoroutineExceptionHandler`.

## Concurrency Checklist (Mandatory)

- [ ] **Cancellation**: loops check `isActive` or call `yield()`?
- [ ] **Structured**: No `GlobalScope`? All children joined/awaited?
- [ ] **Context**: `Dispatchers.Main` used for UI updates?
- [ ] **Leaks**: scopes cancelled in `onCleared` / `onDestroy`?

## Anti-Patterns

- **No GlobalScope**: It leaks. Use structured concurrency.
- **No Async without Await**: Don't `async { ... }` without `await()`.
- **No Blocking**: Never `runBlocking` in prod code (only tests).

## References

- [Advanced Patterns & Flow Examples](references/advanced-patterns.md)