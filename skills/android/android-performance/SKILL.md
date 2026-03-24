---
name: android-performance
description: "Optimize Android app startup, UI rendering, and frame stability with Baseline Profiles and lazy initialization. Use when reducing startup time, diagnosing jank, or improving UI rendering performance. (triggers: **/*Benchmark.kt, **/*Initializer.kt, BaselineProfile, JankStats, recomposition)"
---

# Android Performance Standards

## **Priority: P1**

## 1. Accelerate Startup

- Generate **Baseline Profiles** for all production apps — pre-compiles critical paths (30-40% startup improvement).
- Defer heavy SDK init using `App Startup` or lazy Singletons. Never block `Application.onCreate`.

```kotlin
// Lazy singleton — defers initialization until first access
val analytics: Analytics by lazy { Analytics.create(appContext) }
```

## 2. Eliminate UI Jank

- Use Layout Inspector to find unnecessary recompositions.
- Load images with Coil/Glide using proper caching and resizing (`.crossfade()`).
- `LazyColumn` must use `key` and stable item classes.

```kotlin
LazyColumn {
    items(users, key = { it.id }) { user ->
        UserRow(user)
    }
}
```

## 3. Avoid Layout Bottlenecks

- Replace nested weights with `ConstraintLayout` (Views) or `Row`/`Column` with `Modifier.weight` (Compose).
- Never hold Activity context in Singletons — use Application context to prevent memory leaks.

## Anti-Patterns

- **No Nested Weights**: Use ConstraintLayout (Views) or Row/Column (Compose) instead.
- **No Activity Context in Singletons**: Use Application context to prevent memory leaks.

## References

- [Baseline & Startup](references/implementation.md)
