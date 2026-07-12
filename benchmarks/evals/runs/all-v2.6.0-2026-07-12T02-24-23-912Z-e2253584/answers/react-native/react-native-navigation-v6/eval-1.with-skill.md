Declare a typed tab param list and create the navigator with createBottomTabNavigator using that type. Register each screen with a route name from the param list, and type screen components with NativeStackScreenProps or the appropriate bottom-tab props. Use stable route names and keep tab screens focused on UI and callbacks.

If tabs are nested in a stack, use CompositeScreenProps for the combined navigation type. Keep navigator nesting shallow and use React Navigation's typed APIs rather than untyped route strings.



