---
name: react-native-navigation
description: "Set up navigation stacks and deep linking with React Navigation in React Native. Use when setting up navigation stacks or deep linking in React Native with React Navigation. (triggers: **/App.tsx, **/*Navigator.tsx, **/*Screen.tsx, NavigationContainer, createStackNavigator, createBottomTabNavigator, linking, deep link)"
---

# React Native Navigation

## **Priority: P1 (OPERATIONAL)**

Navigation and deep linking using React Navigation.

## Configure Type-Safe Navigation

- **Library**: Use `@react-navigation/native-stack` for native performance.
- **Type Safety**: Define `RootStackParamList` for all navigators.
- **Deep Links**: Configure `linking` prop in `NavigationContainer`.
- **Validation**: Validate route parameters (`route.params`) before fetching data.

```tsx
import { NavigationContainer } from '@react-navigation/native';

type RootStackParamList = {
  Home: undefined;
  Detail: { itemId: string };
};

const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: { Home: '', Detail: 'item/:itemId' },
  },
};

function App() {
  return (
    <NavigationContainer linking={linking} fallback={<Loading />}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Anti-Patterns

- **No Untyped Navigation**: `navigation.navigate('Unknown')` leads to errors. Use typed params.
- **No Manual URL Parsing**: Use `linking.config`, not manual string parsing.
- **No Unvalidated Deep Links**: Handle invalid IDs gracefully (e.g., redirect to Home/404).

## References

See [references/routing-patterns.md](references/routing-patterns.md) for typed param lists and deep linking config.
