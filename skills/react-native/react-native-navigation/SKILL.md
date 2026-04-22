---
name: react-native-navigation
description: Set up navigation stacks and deep linking with React Navigation in React Native. Use when setting up navigation stacks or deep linking in React Native with React Navigation.
metadata:
  triggers:
    files:
    - '**/App.tsx'
    - '**/*Navigator.tsx'
    - '**/*Screen.tsx'
    keywords:
    - NavigationContainer
    - createStackNavigator
    - createBottomTabNavigator
    - linking
    - deep link
---
# React Native Navigation

## **Priority: P1 (OPERATIONAL)**


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