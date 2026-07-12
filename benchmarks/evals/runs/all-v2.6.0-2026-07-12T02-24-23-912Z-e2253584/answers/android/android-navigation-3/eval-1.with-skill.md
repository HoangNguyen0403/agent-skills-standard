# Defining routes in Navigation 3

Navigation 3 uses typed Kotlin values as routes instead of string patterns. A route with no arguments can be a `data object`; a route with arguments should be a `data class` whose properties hold those arguments.

```kotlin
data object RouteHome
data class RouteDetail(val id: String)
data object RouteSettings
```

The argument is now a normal Kotlin property, so there is no `"detail/{id}"` placeholder, string interpolation, or `NavBackStackEntry` argument lookup. A route is created with the value it needs:

```kotlin
val detail = RouteDetail(id = "42")
```

The application owns a stateful list of route values and renders it with `NavDisplay`:

```kotlin
@Composable
fun AppNavigation() {
    val backStack = remember {
        mutableStateListOf<Any>(RouteHome)
    }

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = { key ->
            when (key) {
                is RouteHome -> NavEntry(key) {
                    HomeScreen(
                        onOpenDetail = { id ->
                            backStack.add(RouteDetail(id = id))
                        },
                        onOpenSettings = {
                            backStack.add(RouteSettings)
                        }
                    )
                }

                is RouteDetail -> NavEntry(key) {
                    DetailScreen(id = key.id)
                }

                is RouteSettings -> NavEntry(key) {
                    SettingsScreen()
                }

                else -> error("Unknown route: $key")
            }
        }
    )
}
```

For example, `backStack.add(RouteDetail("42"))` is the Navigation 3 equivalent of `navController.navigate("detail/42")`, and `backStack.removeLastOrNull()` is the equivalent of popping. To return to a single root route, clear and repopulate the list:

```kotlin
backStack.clear()
backStack.add(RouteHome)
```

The important rules are:

- Use `data object` or `data class` route values rather than string route names.
- Put navigation arguments directly on the route data class.
- Keep the back stack as `mutableStateListOf<Any>` (usually inside `remember`).
- Handle every route in `NavDisplay`'s `entryProvider`; fail explicitly for an unknown route.
- If routes must be restored after process death, make them persistable as required by the chosen state-saving approach, such as `Parcelable` or `@Serializable` routes.

