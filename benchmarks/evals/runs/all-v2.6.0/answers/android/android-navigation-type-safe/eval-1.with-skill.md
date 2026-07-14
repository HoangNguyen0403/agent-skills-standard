Use Navigation Compose 2.8.0 or newer with Kotlin serialization-backed route types. Define each destination as a serializable object or data class, then register the destination with the typed `composable<T>` API:

```kotlin
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import kotlinx.serialization.Serializable

@Serializable
sealed interface Screen {
    @Serializable
    data object Home : Screen

    @Serializable
    data class Details(val id: String) : Screen
}

@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home,
    ) {
        composable<Screen.Home> {
            HomeScreen(
                onNavigateToDetails = { id ->
                    navController.navigate(Screen.Details(id))
                },
            )
        }

        composable<Screen.Details> { backStackEntry ->
            val route = backStackEntry.toRoute<Screen.Details>()
            DetailsScreen(id = route.id)
        }
    }
}
```

The navigation call constructs `Screen.Details(id)` instead of assembling a route string. Likewise, `toRoute<Screen.Details>()` decodes the typed arguments; there is no manual `Bundle` parsing. Keep the `NavController` at the navigation-host/graph boundary and expose callbacks from `HomeScreen` and `DetailsScreen`. For a larger app, move related destinations into nested `navigation` graph extensions.

