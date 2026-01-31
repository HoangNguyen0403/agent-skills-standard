---
name: React Native Navigation
description: Navigation and deep linking for React Native using React Navigation.
metadata:
  labels: [react-native, navigation, routing, deep-linking, react-navigation]
  triggers:
    files: ['**/App.tsx', '**/*Navigator.tsx', '**/*Screen.tsx']
    keywords:
      [
        NavigationContainer,
        createStackNavigator,
        createBottomTabNavigator,
        linking,
        deep link,
      ]
---

# React Native Navigation

## **Priority: P1 (OPERATIONAL)**

Navigation and deep linking using React Navigation.

## Guidelines

- **Library**: Use `@react-navigation/native-stack` for native performance.
- **Type Safety**: Define `RootStackParamList` for all navigators.
- **Deep Links**: Configure `linking` prop in `NavigationContainer`.
- **Validation**: Validate route parameters (`route.params`) before fetching data.

[Routing Patterns](references/routing-patterns.md)

## Anti-Patterns

- **No Untyped Navigation**: `navigation.navigate('Unknown')` → Error. Use types.
- **No Manual URL Parsing**: Use `linking.config`, not manual string parsing.
- **No Unvalidated Deep Links**: Handle invalid IDs gracefully (e.g., redirect to Home/404).

## Related Topics

react-native-dls | react-native-notifications | mobile-ux-core
