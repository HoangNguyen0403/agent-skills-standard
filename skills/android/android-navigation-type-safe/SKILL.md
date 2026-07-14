---
name: android-navigation-type-safe
description: Implement type-safe Jetpack Navigation Compose routes using Kotlin serialization. Use only when defining typed Compose destinations and arguments; defer XML navigation, deep links, animations, and generic auth or bottom-navigation work.
metadata:
  triggers:
    files:
    - '**/*NavHost.kt'
    - '**/*Graph.kt'
    keywords:
    - NavHost
    - navController
    - "@Serializable"
---
# Android Navigation Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### Type-Safe Navigation

- **Library**: Navigation Compose 2.8.0+.
- **Routes**: Use `@Serializable` objects/classes instead of String routes.
- **Arguments**: No manual bundle parsing. Use `.toRoute<T>()`.

### Structure

- **Graphs**: Split large apps into nested navigation graphs (`navigation` extension functions).
- **Hoisting**: Hoist navigation events out of Screens. Composable screens should accept callbacks (`onNavigateToX`).

## Anti-Patterns

- **No String Routes**: Use @Serializable typed objects/classes for destinations.
- **No NavController in Composables**: Hoist navigation events to screen-level callbacks.

## References

- [Route Definitions](references/implementation.md)

## Required route example

- For a product detail argument, define `@Serializable data class ProductDetail(val productId: Long)` and navigate with the typed destination; retrieve it with `toRoute<ProductDetail>()`.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Define ProductDetail(val productId
