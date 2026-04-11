---
name: android-compose
description: 'Build high-performance declarative UI with Jetpack Compose state hoisting and recomposition optimization. Use when writing @Composable functions, Screen files, LazyColumn, state hoisting, LaunchedEffect, or diagnosing excessive recomposition. (triggers: **/*Screen.kt, **/*Composable*.kt, **/*Content.kt, @Composable, Modifier, Column, Row, LazyColumn, setContent, recompose, remember, derivedStateOf, LaunchedEffect)'
---
# Jetpack Compose Expert

## **Priority: P0 (CRITICAL)**

**Role**: Android UI Performance Expert. Prioritize frame stability and state management.

## 1. Hoist State Correctly

- **Screen** (Stateful) -> **Content** (Stateless).
- Pass lambdas down (`onItemClick: (Id) -> Unit`).
- NEVER pass ViewModel to stateless composables.
- Use `MaterialTheme.colorScheme`, no hardcoded hex.

See [implementation examples](references/implementation.md) for state hoisting patterns.

## 2. Optimize Recomposition

- Annotate params with `@Stable` or `@Immutable`.
- Use `key` in `LazyColumn` items for stable identity.
- Reuse or make Modifiers static where possible.
- Use `derivedStateOf` for frequently updating derived values.

See [implementation examples](references/implementation.md) for `derivedStateOf` usage.

## 3. Handle Side Effects Properly

- Use `LaunchedEffect` for one-shot or keyed side effects — never run side effects in composition body.
- Move complex calculations to ViewModel or `remember`.

## Anti-Patterns

- **No Side Effects in Composition Body**: Use `LaunchedEffect`, not raw coroutines.
- **No VM Deep Pass**: Hoist state; pass only data/callbacks.
- **No Heavy Computation in Composables**: Offload to ViewModel or `remember`.

## References

- [Optimization Patterns](references/implementation.md)