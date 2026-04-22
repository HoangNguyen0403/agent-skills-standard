---
name: react-native-navigation-v6
description: Configure React Navigation 6+ stacks, tabs, and deep linking for React Native. Use when implementing React Navigation stacks, tabs, or deep linking in React Native.
metadata:
  triggers:
    files:
    - '**/*Navigation*.tsx'
    - 'src/navigation/**'
    keywords:
    - navigation
    - react-navigation
    - stack
    - tab
    - drawer
    - deep link
---
# React Native Navigation

## **Priority: P0 (CRITICAL)**

Use **React Navigation** (official solution).

## Build Type-Safe Navigation Stacks

- **Architecture**: Use **Native Stack (`createNativeStackNavigator`)** by default for native performance. Only use **JS Stack** for custom transitions.
- **Typing**: Use **`NativeStackScreenProps`** for screens. **`CompositeScreenProps`** for nested Navigators.

See [deep linking reference](references/deep-linking.md) for typed param lists and stack navigator setup.

## Configure Deep Linking

- **Deep Linking**: Use **prefix arrays** in `linking` config. Validate **Universal Links (iOS)** and **App Links (Android)**. Handle **unrecognized paths** with 404 screen.

See [deep linking reference](references/deep-linking.md) for linking configuration with prefix arrays and fallback screens.

## Implement Auth Flow

- **Auth/App split**: Conditionally render Auth Stack vs App Stack in `NavigationContainer`. **Clear navigation state** after logout.
- **Logic**: Use **Tab Navigators** for bottom navigation. **Drawer** for side menus.
- **Transitions**: Native-like feel via **`presentation: 'modal'`**. Custom `headerLeft/Right` in `options`.
- **Data Flow**: Use `route.params` for small IDs only. Use **global state (Zustand/RTK)** for complex data objects.

## Anti-Patterns

- **No String Literals**: Use typed params.
- **No Navigation in Business Logic**: Pass callbacks from screens.
- **No Deep Nesting**: Max 2-3 levels of navigators.

## References

See [references/deep-linking.md](references/deep-linking.md) for typed param lists, Universal Links, Nested Navigators, and State Persistence.