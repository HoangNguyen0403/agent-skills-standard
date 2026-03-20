---
name: react-native-navigation
description: "Navigation and deep linking for React Native using React Navigation. Use when setting up navigation stacks or deep linking in React Native with React Navigation. (triggers: **/App.tsx, **/*Navigator.tsx, **/*Screen.tsx, NavigationContainer, createStackNavigator, createBottomTabNavigator, linking, deep link)"
---

# React Native Navigation

## **Priority: P1 (OPERATIONAL)**

Navigation and deep linking using React Navigation.

## Guidelines

- **Library**: Use `@react-navigation/native-stack` for native performance.
- **Type Safety**: Define `RootStackParamList` for all navigators.
- **Deep Links**: Configure `linking` prop in `NavigationContainer`.
- **Validation**: Validate route parameters (`route.params`) before fetching data.

## Anti-Patterns

- **No Untyped Navigation**: `navigation.navigate('Unknown')` → Error. Use types.
- **No Manual URL Parsing**: Use `linking.config`, not manual string parsing.
- **No Unvalidated Deep Links**: Handle invalid IDs gracefully (e.g., redirect to Home/404).

## References

See [references/routing-patterns.md](references/routing-patterns.md) for typed param lists and deep linking config.
