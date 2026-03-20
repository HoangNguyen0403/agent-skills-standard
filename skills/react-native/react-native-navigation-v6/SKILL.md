---
name: react-native-navigation-v6
description: "React Navigation 6+ standards for stack, tab, and deep linking. Use when implementing React Navigation stacks, tabs, or deep linking in React Native. (triggers: **/*Navigation*.tsx, src/navigation/**, navigation, react-navigation, stack, tab, drawer, deep link)"
---

# React Native Navigation

## **Priority: P0 (CRITICAL)**

Use **React Navigation** (official solution).

## Implementation Guidelines

- **Typed Navigation**: Use TypeScript to define param lists.
- **Centralized**: Define all navigators in `src/navigation/`.
- **Nesting**: Nest navigators (e.g., Tab inside Stack).
- **Options**: Set `screenOptions` at navigator level, override per screen.
- **Header**: Customize with `headerTitle`, `headerRight`, `headerLeft`.
- **Deep Linking**: Configure `linking` config for universal links.

## Anti-Patterns

- **No String Literals**: Use typed params.
- **No Navigation in Business Logic**: Pass callbacks from screens.
- **No Deep Nesting**: Max 2-3 levels of navigators.

## References

See [references/deep-linking.md](references/deep-linking.md) for typed param lists, Universal Links, Nested Navigators, and State Persistence.
