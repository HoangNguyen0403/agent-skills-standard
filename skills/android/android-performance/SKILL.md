---
name: android-performance
description: "Standards for Baseline Profiles, Startup Time, and UI Rendering. Use when optimizing app startup, jank, or UI rendering performance in Android. (triggers: **/*Benchmark.kt, **/*Initializer.kt, BaselineProfile, JankStats, recomposition)"
---

# Android Performance Standards

## **Priority: P1**

## Implementation Guidelines

### Startup Time

- **Baseline Profiles**: Mandatory for all production apps to pre-compile critical paths (improves startup by 30-40%).
- **Lazy Initialization**: Defer heavy SDK init using `App Startup` or lazy Singletons. Avoid blocking `Application.onCreate`.

### UI Performance

- **Recomposition**: Use "Layout Inspector" to find unnecessary recompositions.
- **Images**: Use Coil/Glide with proper caching and resizing (`.crossfade()`).
- **Lists**: `LazyColumn` must use `key` and stableitem classes.

## Anti-Patterns

- **No Nested Weights**: Use ConstraintLayout (Views) or Row/Column (Compose) instead.
- **No Activity Context in Singletons**: Use Application context to prevent memory leaks.

## References

- [Baseline & Startup](references/implementation.md)
