# Typed bottom tabs in React Navigation 6

Define a param list, then pass it to the navigator and screen props:

```tsx
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

type TabsParamList = {
  Home: undefined;
  Profile: {userId: string};
};

const Tab = createBottomTabNavigator<TabsParamList>();
export type ProfileProps = BottomTabScreenProps<TabsParamList, 'Profile'>;

export function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

Use `navigation.navigate('Profile', {userId: '...'})`; TypeScript will reject missing or incorrect params. For nested navigators, compose param lists with `NavigatorScreenParams` and type the parent route accordingly. Keep route names and params in one source of truth, avoid untyped `any` navigation, and type custom tab bar props if you replace the default tab bar.

