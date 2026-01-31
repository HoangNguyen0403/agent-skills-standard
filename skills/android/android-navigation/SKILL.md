---
name: Android Navigation
description: Navigation for Android using Jetpack Compose Navigation and App Links.
metadata:
  labels: [android, compose, navigation, deep-linking, app-links]
  triggers:
    files: ['**/*Screen.kt', '**/*Activity.kt', '**/NavGraph.kt']
    keywords: [NavController, NavHost, composable, navArgument, deepLinks]
---

# Android Navigation (Jetpack Compose)

## **Priority: P2 (OPTIONAL)**

Navigation and deep linking using Jetpack Compose Navigation.

## Guidelines

- **Library**: Use `androidx.navigation:navigation-compose`.
- **Type Safety**: Use sealed classes for routes, never raw strings.
- **Deep Links**: Configure `intent-filter` in Manifest and `deepLinks` in NavHost.
- **Validation**: Validate arguments (e.g., proper IDs) before loading content.

[Patterns & Examples](references/navigation-patterns.md)

## Anti-Patterns

- **No String Routes**: Use `Screen.Product.route` instead of `"product/$id"`.
- **No Unvalidated Deep Links**: Check resource existence before rendering.
- **No Missing Manifest**: Deep links require `autoVerify=true` intent filters.

## Related Topics

android-design-system | android-notifications | mobile-ux-core
