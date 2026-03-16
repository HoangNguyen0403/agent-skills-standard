---
name: android-navigation-type-safe
description: "Standards for Jetpack Navigation Compose (Type-safe). Use when implementing type-safe navigation graphs in Jetpack Compose for Android. (triggers: **/*NavHost.kt, **/*Graph.kt, NavHost, navController, @Serializable)"
---

# Android Navigation Standards

## **Priority: P0**

## Implementation Guidelines

### Type-Safe Navigation

- **Library**: Navigation Compose 2.8.0+.
- **Routes**: Use `@Serializable` objects/classes instead of String routes.
- **Arguments**: No manual bundle parsing. Use `.toRoute<T>()`.

### Structure

- **Graphs**: Split large apps into nested navigation graphs (`navigation` extension functions).
- **Hoisting**: Hoist navigation events out of Screens. Composable screens should accept callbacks (`onNavigateToX`).

## Anti-Patterns

- **Hardcoded Strings**: `**No String Routes**: Use Typed Objects.`
- **Passing NavController**: `**No NavController in UI**: Hoist events.`

## References

- [Route Definitions](references/implementation.md)
