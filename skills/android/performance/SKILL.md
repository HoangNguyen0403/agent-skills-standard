---
name: Android Performance
description: Standards for Baseline Profiles, Startup Time, and UI Rendering
metadata:
  labels: [android, performance, baseline-profile, startup]
  triggers:
    files: ['**/*Benchmark.kt', '**/*Initializer.kt']
    keywords: ['BaselineProfile', 'JankStats', 'recomposition']
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

- **Nested Weights**: `**Avoid Nested Weights**: Use ConstraintLayout (Views) or simple Row/Col (Compose).`
- **Memory Leaks**: `**Watch Context**: Avoid leaking Activity Context in Singletons.`

## References

- [Baseline & Startup](references/implementation.md)
