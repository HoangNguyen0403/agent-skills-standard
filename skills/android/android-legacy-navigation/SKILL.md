---
name: android-legacy-navigation
description: "Standards for Jetpack Navigation Component (XML) and SafeArgs. Use when working with XML-based Navigation Component or SafeArgs in Android. (triggers: navigation/*.xml, findNavController, NavDirections, navArgs)"
---

# Android Legacy Navigation Standards

## **Priority: P1**

## Implementation Guidelines

### Setup

- **Single Activity**: Use one Host Activity with a `NavHostFragment`.
- **SafeArgs**: MANDATORY for passing data between fragments.

### Graph Management

- **Nested Graphs**: Modularize `navigation/` resources (e.g., `nav_auth.xml`, `nav_main.xml`) to keep graphs readable.
- **Deep Links**: Define explicit `<deepLink>` in graph, not AndroidManifest intent filters (Nav handles them).

## Anti-Patterns

- **No Raw String Bundle Keys**: Use SafeArgs generated type-safe classes.
- **No Manual Fragment commit()**: Use NavController for all navigation.

## References

- [XML Graph & SafeArgs](references/implementation.md)
