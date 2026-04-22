---
name: android-navigation-3
description: Install and migrate to Jetpack Navigation 3. Use when implementing Navigation 3 patterns including NavDisplay, NavKey routes, deep links, multiple backstacks, scenes (dialogs, bottom sheets), or migrating from Navigation 2.
metadata:
  triggers:
    files:
    - '**/*NavHost.kt'
    - '**/*Navigation*.kt'
    - '**/*Screen.kt'
    keywords:
    - Navigation 3
    - NavDisplay
    - NavKey
    - NavEntry
    - migrate navigation
    - multiple backstacks
    - nav3
---
# Jetpack Navigation 3

## **Priority: P1**

Guide for implementing and migrating to Navigation 3 in Jetpack Compose.

## Core concepts

Navigation 3 replaces the previous `NavHost`/`NavController` pattern with a simpler, state-driven approach:
- **Routes** are Kotlin data objects/classes (not strings).
- **Back stack** is a plain `mutableStateListOf<Any>`.
- **`NavDisplay`** renders the current route based on a lambda.

## Basic usage

```kotlin
val backStack = remember { mutableStateListOf<Any>(RouteHome) }

NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider = { key ->
        when (key) {
            is RouteHome -> NavEntry(key) { HomeScreen(onNavigate = { backStack.add(it) }) }
            is RouteDetail -> NavEntry(key) { DetailScreen(key.id) }
            else -> error("Unknown route: $key")
        }
    }
)
```

## Migration from Navigation 2

See [migration guide](references/migration-guide.md) for step-by-step conversion from `NavHost`/`NavController` to `NavDisplay`.

Key changes:
1. Replace string routes with data objects/classes.
2. Replace `NavHost` with `NavDisplay`.
3. Replace `NavController.navigate()` with direct list manipulation.
4. Replace `navArgument` with data class properties.

## Common patterns

See [recipes](references/recipes.md) for code examples:
- Basic navigation with arguments
- Bottom navigation with multiple backstacks
- Deep links (basic and with synthetic backstack)
- Dialogs and bottom sheets
- Conditional navigation (auth flows)
- Returning results between screens
- Modularized navigation with Hilt or Koin

## Verification

- [ ] Routes are data objects/classes, no string-based routing.
- [ ] Back stack is a `mutableStateListOf<Any>`.
- [ ] `NavDisplay` handles all routes in `entryProvider`.
- [ ] `./gradlew build` succeeds.

## Anti-Patterns

- **No string-based routes**: Use Kotlin data objects/classes for type safety.
- **No NavController for new projects**: Use `NavDisplay` with a state list.
- **No `remember { navController() }`**: Navigation 3 doesn't use NavController.

## References

- [Migration Guide (Nav2 → Nav3)](references/migration-guide.md)
- [Recipes](references/recipes.md)
