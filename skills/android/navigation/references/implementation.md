# Type-Safe Navigation (Compose)

## Route Definitions

```kotlin
@Serializable
sealed interface Screen {
    @Serializable
    data object Home : Screen

    @Serializable
    data class Details(val id: String) : Screen
}
```

## NavHost Setup

```kotlin
@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController()
) {
    NavHost(navController = navController, startDestination = Screen.Home) {
        composable<Screen.Home> {
            HomeScreen(onNavigateToDetails = { id ->
                navController.navigate(Screen.Details(id))
            })
        }

        composable<Screen.Details> { backStackEntry ->
            val route: Screen.Details = backStackEntry.toRoute()
            DetailsScreen(id = route.id)
        }
    }
}
```
