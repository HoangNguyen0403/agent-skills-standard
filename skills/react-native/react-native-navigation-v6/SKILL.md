---
name: react-native-navigation-v6
description: "Configure React Navigation 6+ stacks, tabs, and deep linking for React Native. Use when implementing React Navigation stacks, tabs, or deep linking in React Native. (triggers: **/*Navigation*.tsx, src/navigation/**, navigation, react-navigation, stack, tab, drawer, deep link)"
---

# React Native Navigation

## **Priority: P0 (CRITICAL)**

Use **React Navigation** (official solution).

## Build Type-Safe Navigation Stacks

- **Architecture**: Use **Native Stack (`createNativeStackNavigator`)** by default for native performance. Only use **JS Stack** for custom transitions.
- **Typing**: Use **`NativeStackScreenProps`** for screens. **`CompositeScreenProps`** for nested Navigators.

```tsx
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type ProfileProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function ProfileScreen({ route }: ProfileProps) {
  const { userId } = route.params;
  return <Text>{userId}</Text>;
}
```

## Configure Deep Linking

- **Deep Linking**: Use **prefix arrays** in `linking` config. Validate **Universal Links (iOS)** and **App Links (Android)**. Handle **unrecognized paths** with a 404 screen.

```tsx
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      Profile: 'user/:userId',
      Settings: 'settings',
      NotFound: '*',
    },
  },
};

<NavigationContainer linking={linking} fallback={<ActivityIndicator />}>
  <Stack.Navigator>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
</NavigationContainer>
```

## Implement Auth Flow

- **Auth/App split**: Conditionally render Auth Stack vs App Stack in `NavigationContainer`. **Clear the navigation state** after logout.
- **Logic**: Use **Tab Navigators** for bottom navigation. **Drawer** for side menus.
- **Transitions**: Native-like feel via **`presentation: 'modal'`**. Custom `headerLeft/Right` in `options`.
- **Data Flow**: Use `route.params` for small IDs only. Use **global state (Zustand/RTK)** for complex data objects.

## Anti-Patterns

- **No String Literals**: Use typed params.
- **No Navigation in Business Logic**: Pass callbacks from screens.
- **No Deep Nesting**: Max 2-3 levels of navigators.

## References

See [references/deep-linking.md](references/deep-linking.md) for typed param lists, Universal Links, Nested Navigators, and State Persistence.
