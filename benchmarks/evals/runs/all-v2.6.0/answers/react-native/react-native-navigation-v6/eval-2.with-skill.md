Define a param list whose route entry describes the required parameters, for example Details: { itemId: string }. Type the screen's navigation prop from that list and call navigation.navigate with the route name and matching object. Routes without parameters should be typed as undefined.

Use NativeStackScreenProps for stack screens and CompositeScreenProps for nested navigators. Pass only small IDs through route.params; keep larger domain objects in shared state, and do not navigate from business logic services.



