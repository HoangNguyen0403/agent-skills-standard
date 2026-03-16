---
name: android-navigation
description: "Navigation for Android using Jetpack Compose Navigation and App Links. Use when implementing navigation flows, deep links, or backstack handling in Android. (triggers: **/*Screen.kt, **/*Activity.kt, **/NavGraph.kt, NavController, NavHost, composable, navArgument, deepLinks)"
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
