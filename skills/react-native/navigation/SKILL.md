---
name: React Native Navigation
description: React Navigation 6+ standards for stack, tab, and deep linking.
metadata:
  labels: [react-native, navigation, routing, deep-linking]
  triggers:
    files: ['**/*Navigation*.tsx', 'src/navigation/**']
    keywords: [navigation, react-navigation, stack, tab, drawer, deep link]
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

## Code

```tsx
type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
};

// Typed Navigation
const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Profile' component={ProfileScreen} />
    </Stack.Navigator>
  );
}

// Usage in Screen
function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  navigation.navigate('Profile', { userId: '123' });
}
```

## Anti-Patterns

- **No String Literals**: Use typed params.
- **No Navigation in Business Logic**: Pass callbacks from screens.
- **No Deep Nesting**: Max 2-3 levels of navigators.

## Reference & Examples

See [references/deep-linking.md](references/deep-linking.md) for Universal Links, Nested Navigators, and State Persistence.

## Related Topics

architecture | typescript/language
