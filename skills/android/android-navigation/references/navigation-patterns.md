# Android Navigation Patterns (Jetpack Compose)

## 1. Setup

```kotlin
// build.gradle
dependencies {
    implementation "androidx.navigation:navigation-compose:2.7.6"
}
```

## 2. Type-Safe Routes

```kotlin
sealed class Screen(val route: String) {
    object Home : Screen("home")
    data class Product(val productId: String) : Screen("product/$productId") {
        companion object {
            const val ROUTE = "product/{productId}"
        }
    }
}
```

## 3. Navigation Graph

```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = Screen.Home.route) {
        composable(Screen.Home.route) {
            HomeScreen(onProductClick = { id ->
                navController.navigate(Screen.Product(id).route)
            })
        }
        composable(
            route = Screen.Product.ROUTE,
            arguments = listOf(navArgument("productId") { type = NavType.StringType }),
            deepLinks = listOf(
                navDeepLink { uriPattern = "myapp://product/{productId}" },
                navDeepLink { uriPattern = "https://example.com/product/{productId}" }
            )
        ) { backStackEntry ->
            val productId = backStackEntry.arguments?.getString("productId")
            ProductScreen(productId = productId ?: "")
        }
    }
}
```

## 4. Deep Linking Configuration

```xml
<!-- AndroidManifest.xml -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" android:host="product" />
    <data android:scheme="https" android:host="example.com" android:pathPrefix="/product" />
</intent-filter>
```

## 5. Bottom Navigation

```kotlin
Scaffold(
    bottomBar = {
        NavigationBar {
            NavigationBarItem(
                selected = currentRoute == "home",
                onClick = { navController.navigate("home") },
                icon = { Icon(Icons.Default.Home, "Home") }
            )
        }
    }
) { padding ->
    NavHost(modifier = Modifier.padding(padding)) { ... }
}
```
