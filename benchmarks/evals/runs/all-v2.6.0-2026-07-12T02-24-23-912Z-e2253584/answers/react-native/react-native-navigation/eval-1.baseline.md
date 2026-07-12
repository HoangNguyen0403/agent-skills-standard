# Typed stack navigation

Define a route param list and give it to the stack navigator:

```tsx
type RootStackParamList = {
  Home: undefined;
  Details: {itemId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Type screens with `NativeStackScreenProps<RootStackParamList, 'Details'>` and navigate using `navigation.navigate('Details', {itemId})`. Use `undefined` for routes with no params, compose types for nested navigators with `NavigatorScreenParams`, and avoid stringly typed wrappers that erase the route contract. Keep params serializable and pass stable identifiers rather than putting application state in navigation.

