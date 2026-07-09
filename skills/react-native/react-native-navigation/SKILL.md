---
name: react-native-navigation
description: Configure deep linking and URL-based routing with React Navigation in React Native. Use when setting up deep linking, universal links, or URL-to-screen routing in React Native with React Navigation.
metadata:
  triggers:
    files:
    - '**/App.tsx'
    - '**/*Navigator.tsx'
    - '**/*Screen.tsx'
    keywords:
    - NavigationContainer
    - createNativeStackNavigator
    - createBottomTabNavigator
    - linking
    - deep link
---
# React Native Navigation — Deep Linking

## **Priority: P1 (HIGH)**

Deep-linking companion to [react-native-navigation-v6](../react-native-navigation-v6/SKILL.md), which owns stack/tab/drawer setup and auth-flow structure. For **new Expo projects**, prefer **Expo Router** (file-based, built on React Navigation) — see [react-native-architecture](../react-native-architecture/SKILL.md) for the decision criteria.

## Configure Type-Safe Navigation

- **Library**: Use `@react-navigation/native-stack` for native performance.
- **Type Safety**: Define `RootStackParamList` for all navigators.
- **Deep Links**: Configure `linking` prop in `NavigationContainer`.
- **Validation**: Validate route parameters (`route.params`) before fetching data.

See [routing patterns](references/routing-patterns.md) for type-safe stack setup and deep linking configuration.

## Anti-Patterns

- **No Untyped Navigation**: `navigation.navigate('Unknown')` leads to errors. Use typed params.
- **No Manual URL Parsing**: Use `linking.config`, not manual string parsing.
- **No Unvalidated Deep Links**: Handle invalid IDs gracefully (e.g., redirect to Home/404).

## References

See [references/routing-patterns.md](references/routing-patterns.md) for typed param lists and deep linking config.