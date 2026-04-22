---
name: android-navigation
description: Implement navigation with Jetpack Compose Navigation and App Links on Android. Use when implementing navigation flows, deep links, or backstack handling.
metadata:
  triggers:
    files:
    - '**/*Screen.kt'
    - '**/*Activity.kt'
    - '**/NavGraph.kt'
    keywords:
    - NavController
    - NavHost
    - composable
    - navArgument
    - deepLinks
---
# Android Navigation (Jetpack Compose)

## **Priority: P2 (OPTIONAL)**


## Guidelines

- **Library**: Use `androidx.navigation:navigation-compose`.
- **Type Safety**: Use sealed classes for routes, never raw strings.
- **Deep Links**: Configure `intent-filter` in Manifest and `deepLinks` in NavHost.
- **Validation**: Validate arguments (e.g., proper IDs) before loading content.

## Anti-Patterns

- **No String Routes**: Use `Screen.Product.route` instead of `"product/$id"`.
- **No Unvalidated Deep Links**: Check resource existence before rendering.
- **No Missing Manifest**: Deep links require `autoVerify=true` intent filters.

## References

- [Navigation Patterns](references/navigation-patterns.md)