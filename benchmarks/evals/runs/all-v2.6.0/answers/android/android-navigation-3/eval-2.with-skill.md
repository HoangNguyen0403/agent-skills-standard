# Replacing `NavHost` and `NavController`

Navigation 3 makes the back stack application state. Replace the `NavController` with a `mutableStateListOf<Any>`, replace `NavHost` with `NavDisplay`, and navigate by adding or removing typed route values.

First define route values instead of string routes:

```kotlin
data object RouteHome
data class RouteDetail(val id: String)
data object RouteLogin
```

Then render and mutate the list directly:

```kotlin
@Composable
fun AppNavigation(isLoggedIn: Boolean) {
    val backStack = remember(isLoggedIn) {
        mutableStateListOf<Any>(
            if (isLoggedIn) RouteHome else RouteLogin
        )
    }

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = { key ->
            when (key) {
                is RouteLogin -> NavEntry(key) {
                    LoginScreen(
                        onLoginSuccess = {
                            backStack.clear()
                            backStack.add(RouteHome)
                        }
                    )
                }

                is RouteHome -> NavEntry(key) {
                    HomeScreen(
                        onOpenDetail = { id ->
                            backStack.add(RouteDetail(id = id))
                        }
                    )
                }

                is RouteDetail -> NavEntry(key) {
                    DetailScreen(id = key.id)
                }

                else -> error("Unknown route: $key")
            }
        }
    )
}
```

The Navigation 2 operations map to Navigation 3 as follows:

```kotlin
// Navigation 2
navController.navigate("detail/$id")
navController.popBackStack()
navController.navigate("home") {
    popUpTo("home") { inclusive = true }
}

// Navigation 3
backStack.add(RouteDetail(id))
backStack.removeLastOrNull()
backStack.clear()
backStack.add(RouteHome)
```

The detail argument is read directly from `RouteDetail.id`; there is no `navArgument` declaration or `backStackEntry.arguments` lookup. Likewise, new screens should not create or remember a `NavController`.

For a deep link, parse the incoming intent or URI at the Activity/composable boundary and convert it into a route value before adding it to the list:

```kotlin
val id = intent?.data?.getQueryParameter("id")
if (id != null) {
    backStack.add(RouteDetail(id))
}
```

The migration checklist is:

1. Add the Navigation 3 runtime and UI dependencies and remove the old Navigation 2 dependencies after migration.
2. Convert string route constants and placeholders to `data object`/`data class` route values.
3. Move ownership of the back stack into Compose state.
4. Replace `NavHost` with `NavDisplay` and provide a `NavEntry` for every route.
5. Replace `navigate`, `popBackStack`, and `popUpTo` calls with list operations.
6. Test back behavior, deep links, configuration/process restoration, and any auth-stack reset explicitly.

