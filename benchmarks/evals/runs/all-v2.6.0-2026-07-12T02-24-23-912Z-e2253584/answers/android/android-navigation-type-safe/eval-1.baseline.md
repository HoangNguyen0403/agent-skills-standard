# Type-safe navigation in Navigation 2.8

Navigation 2.8 adds a Kotlin-serialization-based route model. Define each destination as a serializable Kotlin type, register that type with the `NavHost`, navigate by constructing the type, and decode it with `toRoute()`.

```kotlin
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import kotlinx.serialization.Serializable

@Serializable
data object Home

@Serializable
data class Settings(val from: String? = null)

@Composable
fun App() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Home,
    ) {
        composable<Home> {
            HomeScreen(
                onOpenSettings = {
                    navController.navigate(Settings(from = "home"))
                },
            )
        }

        composable<Settings> { backStackEntry ->
            val route = backStackEntry.toRoute<Settings>()
            SettingsScreen(
                source = route.from,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
```

Enable Kotlin serialization in the module and include the matching Navigation Compose and serialization dependencies. The route classes must be `@Serializable`; destination objects represent destinations without arguments, while serializable data classes represent destinations with arguments. `composable<T>()`, `navigate(T)`, and `toRoute<T>()` must use the same route type.

This removes hand-written route strings, query-parameter names, and manual argument parsing. It does not remove the need to choose navigation behavior such as `popUpTo`, `launchSingleTop`, or `restoreState`; those remain options on the normal `navigate` call.

