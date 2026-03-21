---
name: react-native-navigation-v6
description: 'React Navigation 6+ standards for stack, tab, and deep linking. Use when implementing React Navigation stacks, tabs, or deep linking in React Native. (triggers: **/*Navigation*.tsx, src/navigation/**, navigation, react-navigation, stack, tab, drawer, deep link)'
---

# React Native Navigation

## **Priority: P0 (CRITICAL)**

Use **React Navigation** (official solution).

## Implementation Guidelines

- **Architecture**: Use **Native Stack (`createNativeStackNavigator`)** by default for native performance. Only use **JS Stack** for custom transitions.
- **Deep Linking**: Use **prefix arrays** in `linking` config. Validate **Universal Links (iOS)** and **App Links (Android)**. Handle **unrecognized paths** with a 404 screen.
- **Typing**: Use **`NativeStackScreenProps`** for screens. **`CompositeScreenProps`** for nested Navigators. **`useNavigation`** must be typed with `NativeStackNavigationProp`.
- **Logic**: Use **Tab Navigators** for bottom navigation. **Drawer** for side menus. **Auth/App split** with conditional rendering in `NavigationContainer`.
- **Transitions**: Native-like feel via **`presentation: 'modal'`**. Custom `headerLeft/Right` in `options`.
- **Redirection**: Handle **auth state changes** in the top-level Navigator (Auth Stack vs App Stack). **Clear the navigation state** after logout.
- **Data Flow**: Use `route.params` for small IDs only. Use **global state (Zustand/RTK)** for complex data objects.

## Anti-Patterns

- **No String Literals**: Use typed params.
- **No Navigation in Business Logic**: Pass callbacks from screens.
- **No Deep Nesting**: Max 2-3 levels of navigators.

## References

See [references/deep-linking.md](references/deep-linking.md) for typed param lists, Universal Links, Nested Navigators, and State Persistence.
