# Navigation 2 → Navigation 3 Migration Guide

## Step 1: Add Navigation 3 dependencies

```kotlin
dependencies {
    implementation("androidx.navigation3:navigation3-runtime:1.0.0")
    implementation("androidx.navigation3:navigation3-ui:1.0.0")
}
```

Remove old Navigation 2 dependencies after migration is complete.

## Step 2: Convert string routes to data objects

```kotlin
// BEFORE (Navigation 2)
const val ROUTE_HOME = "home"
const val ROUTE_DETAIL = "detail/{id}"

// AFTER (Navigation 3)
data object RouteHome
data class RouteDetail(val id: String)
```

## Step 3: Replace NavHost with NavDisplay

```kotlin
// BEFORE (Navigation 2)
val navController = rememberNavController()
NavHost(navController = navController, startDestination = "home") {
    composable("home") { HomeScreen(onNavigate = { navController.navigate("detail/$it") }) }
    composable("detail/{id}") { backStackEntry ->
        val id = backStackEntry.arguments?.getString("id")
        DetailScreen(id = id ?: ")
    }
}

// AFTER (Navigation 3)
val backStack = remember { mutableStateListOf<Any>(RouteHome) }
NavDisplay(
    backStack = backStack,
    onBack = { backStack.removeLastOrNull() },
    entryProvider = { key ->
        when (key) {
            is RouteHome -> NavEntry(key) {
                HomeScreen(onNavigate = { id -> backStack.add(RouteDetail(id)) })
            }
            is RouteDetail -> NavEntry(key) {
                DetailScreen(id = key.id)
            }
            else -> error("Unknown route: $key")
        }
    }
)
```

## Step 4: Replace navigation calls

```kotlin
// BEFORE
navController.navigate("detail/$id")
navController.popBackStack()
navController.navigate("home") { popUpTo("home") { inclusive = true } }

// AFTER
backStack.add(RouteDetail(id))
backStack.removeLastOrNull()
backStack.clear(); backStack.add(RouteHome)
```

## Step 5: Migrate deep links

```kotlin
// BEFORE (Navigation 2) — declared in NavHost
composable(
    "detail/{id}",
    deepLinks = listOf(navDeepLink { uriPattern = "app://detail/{id}" })
) { /* ... */ }

// AFTER (Navigation 3) — handle in Activity, convert to route
override fun onCreate(savedInstanceState: Bundle?) {
    val deepLinkId = intent?.data?.getQueryParameter("id")
    if (deepLinkId != null) {
        backStack.add(RouteDetail(deepLinkId))
    }
}
```

## Step 6: Migrate SavedStateHandle

```kotlin
// Navigation 3 routes are data classes — pass them directly to ViewModel
class DetailViewModel(val route: RouteDetail) : ViewModel() {
    val id = route.id  // No SavedStateHandle needed for navigation args
}
```

## Key differences summary

| Aspect | Navigation 2 | Navigation 3 |
|--------|-------------|-------------|
| Routes | Strings (`"detail/{id}"`) | Data objects/classes (`RouteDetail(id)`) |
| Back stack | Internal to NavController | `mutableStateListOf<Any>` (you own it) |
| Entry point | `NavHost` | `NavDisplay` |
| Navigation | `navController.navigate()` | `backStack.add()` |
| Arguments | `navArgument` + `backStackEntry` | Data class properties |
| Deep links | Declared in NavHost | Parsed in Activity/Composable |
