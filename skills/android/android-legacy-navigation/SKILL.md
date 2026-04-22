---
name: android-legacy-navigation
description: Implement Jetpack Navigation Component with XML graphs and SafeArgs for type-safe fragment navigation. Use when working with XML-based navigation or SafeArgs in legacy Android projects.
metadata:
  triggers:
    files:
    - 'navigation/*.xml'
    keywords:
    - findNavController
    - NavDirections
    - navArgs
---
# Android Legacy Navigation Standards

## **Priority: P1**

## 1. Set Up Single-Activity Architecture

- Use one Host Activity with `NavHostFragment`.
- Enable SafeArgs plugin — MANDATORY for passing data between fragments.

See [XML graph & SafeArgs examples](references/implementation.md) for NavHostFragment setup.

## 2. Manage Navigation Graphs

- **Nested Graphs**: Modularize `navigation/` resources (e.g., `nav_auth.xml`, `nav_main.xml`) to keep graphs readable.
- **Deep Links**: Define explicit `<deepLink>` in graph, not AndroidManifest intent filters.

## 3. Navigate with SafeArgs

See [XML graph & SafeArgs examples](references/implementation.md) for type-safe navigation usage.

## Anti-Patterns

- **No Raw String Bundle Keys**: Use SafeArgs generated type-safe classes.
- **No Manual Fragment commit()**: Use NavController for all navigation.

## References

- [XML Graph & SafeArgs](references/implementation.md)