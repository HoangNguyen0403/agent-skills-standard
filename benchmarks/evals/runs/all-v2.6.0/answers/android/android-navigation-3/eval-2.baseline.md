# Replacing `NavHost` and `NavController` with Navigation 3

Navigation 3 moves navigation state into an app-owned back stack. `NavDisplay` replaces the rendering role of `NavHost`, and there is usually no `NavController`. Screens receive callbacks such as `onOpenDetails` rather than a controller that they can mutate.

Define serializable keys and keep the stack at the app or feature-host level:

```kotlin
@Serializable
sealed interface AppRoute : NavKey {
    @Serializable
    data object Home : AppRoute

    @Serializable
    data class Details(val id: String) : AppRoute
}

@Composable
fun AppNavigation() {
    val backStack = rememberNavBackStack(AppRoute.Home)

    NavDisplay(
        backStack = backStack,
        onBack = {
            // Do not remove the root entry. Delegate this case to the activity
            // or system back handling if the app should exit.
            if (backStack.size > 1) {
                backStack.removeLastOrNull()
            }
        },
        entryProvider = entryProvider {
            entry<AppRoute.Home> {
                HomeScreen(
                    onOpenDetails = { id ->
                        backStack.add(AppRoute.Details(id))
                    },
                )
            }
            entry<AppRoute.Details> { key ->
                DetailsScreen(
                    id = key.id,
                    onDone = { backStack.removeLastOrNull() },
                )
            }
        },
    )
}
```

The rough Navigation 2 to Navigation 3 mapping is:

| Navigation 2 | Navigation 3 |
| --- | --- |
| `NavHost` | `NavDisplay` plus an `entryProvider` |
| `NavController` back stack | `rememberNavBackStack(...)` or another app-owned state list |
| `navigate(route)` | `backStack.add(TypedKey(...))` |
| `navigateUp()` / back pop | `backStack.removeLastOrNull()` with a root guard |
| route string and arguments | serializable `NavKey` object/data class |
| `popUpTo` | remove entries from the list until the desired key remains |

For example, a simple replace operation is:

```kotlin
backStack.removeLastOrNull()
backStack.add(AppRoute.Details(id))
```

If a destination should be single-top, check the current key before adding it. If a flow needs to clear everything back to Home, remove entries while `backStack.size > 1`. These policies should live in the navigation host or a small navigator abstraction, not be duplicated in every screen.

`rememberNavBackStack` is preferable for a Compose back stack whose keys are serializable because it integrates with state restoration. The stack is the source of truth; `NavDisplay` observes it and renders the current entries. A route key should identify the destination and its stable arguments, while screen state and data remain in the normal state-saving/ViewModel/repository layers. Handle deep links by translating the external URI into a typed key and constructing the desired stack explicitly.

