# Defining routes in Navigation 3

Navigation 3 uses typed `NavKey` values instead of string route patterns. A route is normally a serializable object or data class. The object represents a destination without arguments; the data class carries destination arguments in its properties.

```kotlin
import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable
sealed interface AppRoute : NavKey {
    @Serializable
    data object Home : AppRoute

    @Serializable
    data class Details(val itemId: String) : AppRoute

    @Serializable
    data object Settings : AppRoute
}
```

The `@Serializable` annotations matter when the back stack must be saved and restored. Keep route keys small and represent only navigation state; load the actual item from a repository or ViewModel using `itemId` rather than putting an entire domain object in the route.

There is no required string route table equivalent to a Navigation 2 XML or `composable("details/{id}")` graph. Register the UI for each key with an `entryProvider`:

```kotlin
val backStack = rememberNavBackStack(AppRoute.Home)

NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider = entryProvider {
        entry<AppRoute.Home> {
            HomeScreen(
                onItemClick = { id ->
                    backStack.add(AppRoute.Details(id))
                },
                onSettingsClick = {
                    backStack.add(AppRoute.Settings)
                },
            )
        }
        entry<AppRoute.Details> { key ->
            DetailsScreen(itemId = key.itemId)
        }
        entry<AppRoute.Settings> {
            SettingsScreen()
        }
    },
)
```

In this model, `backStack.add(AppRoute.Details("42"))` is the equivalent of navigating to a parameterized string route such as `"details/42"`. Popping is a list operation, for example `backStack.removeLastOrNull()`. Operations such as “single top” or “pop to root” are also expressed by inspecting and changing the list, rather than by calling `navigate()` with navigation options.

The important migration difference is that route matching and argument parsing are handled by Kotlin types. This gives compile-time coverage for destinations and arguments and avoids manually encoding values into strings. For deep links, parse the incoming URI or intent at the app boundary and convert it into the corresponding typed key(s) before adding those keys to the back stack.

