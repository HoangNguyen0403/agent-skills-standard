# Typed navigation parameters in React Navigation 6

Declare the route contract with a param list and derive screen/navigation props:

```tsx
type RootStackParamList = {
  Feed: undefined;
  Details: {itemId: string; from?: 'feed' | 'search'};
};

const Stack = createNativeStackNavigator<RootStackParamList>();
type DetailsProps = NativeStackScreenProps<RootStackParamList, 'Details'>;

function Feed({navigation}: NativeStackScreenProps<RootStackParamList, 'Feed'>) {
  return <Button title="Open" onPress={() => navigation.navigate('Details', {itemId: '42'})} />;
}
```

Use `navigation.navigate('Details', params)` or `push` and let TypeScript enforce the route and parameter shape. For navigation outside screen props, create a typed navigation ref carefully, or pass callbacks rather than using a global escape hatch. For nested navigators, use `NavigatorScreenParams<ChildParamList>` in the parent list. Keep params serializable and pass IDs rather than large objects; load the current entity in the destination and handle missing data.

