Define a RootStackParamList containing every route and its parameter shape, then create a native stack navigator from that type. Wrap it in NavigationContainer and type each screen with NativeStackScreenProps; use CompositeScreenProps when navigators are nested.

Use route.params only for small, typed identifiers. Keep complex data in global state, keep navigation out of business services, and avoid stringly typed routes. For a new Expo app, consider Expo Router instead because it provides file-based routing.



