---
name: android-legacy-state
description: Integrate ViewModel state with Views using Coroutines and Lifecycle on Android. Use when managing state with repeatOnLifecycle or lifecycle-aware coroutines in Fragment/Activity.
metadata:
  triggers:
    files:
    - '**/*Fragment.kt'
    - '**/*Activity.kt'
    keywords:
    - repeatOnLifecycle
    - launchWhenStarted
---
# Android Legacy State Standards

## **Priority: P1**

## Implementation Guidelines

### Flow Consumption

- **Rule**: ALWAYS use `repeatOnLifecycle(Lifecycle.State.STARTED)` to collect flows in Views.
- **Why**: Prevents crashes (collecting while view destroyed) and saves resources (stops collecting in background).

### LiveData vs Flow

- **New Code**: Use `StateFlow` exclusively.
- **Legacy**: If using LiveData, observe with `viewLifecycleOwner` (Fragment), NOT `this`.

## Anti-Patterns

- **No launchWhenStarted/Resumed**: Deprecated. Use repeatOnLifecycle instead.
- **No observe(this) in Fragments**: Use viewLifecycleOwner to prevent lifecycle leaks.

## References

- [Flow Consumption Template](references/implementation.md)