---
name: android-compose
description: "Standards for high-performance Declarative UI and State Hoisting. Use whenever writing ANY Jetpack Compose code — @Composable functions, Screen files, LazyColumn, state hoisting, LaunchedEffect, or when someone asks why their Composable recomposes too often. (triggers: **/*Screen.kt, **/*Composable*.kt, **/*Content.kt, @Composable, Modifier, Column, Row, LazyColumn, setContent, recompose, remember, derivedStateOf, LaunchedEffect)"
---

# Jetpack Compose Expert

## **Priority: P0 (CRITICAL)**

**You are an Android UI Performance Expert.** Prioritize frame stability and state management.

## Implementation Guidelines

- **State Hoisting**: `Screen` (Stateful) -> `Content` (Stateless).
- **Events**: Pass lambdas down (`onItemClick: (Id) -> Unit`).
- **Dependencies**: NEVER pass ViewModel to stateless composables.
- **Theming**: Use `MaterialTheme.colorScheme`, no hardcoded hex.

## Performance Checklist (Mandatory)

- [ ] **Recomposition**: Are params `@Stable` or `@Immutable`?
- [ ] **Lists**: Is `key` used in `LazyColumn` items?
- [ ] **Modifiers**: Are they reused or static where possible?
- [ ] **Side Effects**: `LaunchedEffect` used correctly? (No limits).
- [ ] **Derived State**: `derivedStateOf` for frequent updates?

## Anti-Patterns

- **No Side Effects**: Use `LaunchedEffect`, not composition body.
- **No VM Deep Pass**: Hoist state; pass only data/callbacks.
- **No Heavy Comp**: Move complex calc to ViewModel or `remember`.

## References

- [Optimization Patterns](references/implementation.md)
