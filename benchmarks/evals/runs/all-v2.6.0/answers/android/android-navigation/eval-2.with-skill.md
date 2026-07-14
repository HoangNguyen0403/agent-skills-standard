Handle a web App Link in two places: the Android manifest makes the activity a candidate for the incoming URL, and the Compose `NavHost` maps that URL to a typed destination. The app needs the `androidx.navigation:navigation-compose` dependency.

Define the destination pattern centrally and validate the argument before loading content:

```kotlin
sealed class Screen {
    data object ProductList : Screen() {
        val route = "products"
    }

    data object ProductDetail : Screen() {
        const val route = "product/{productId}"
        const val argument = "productId"
    }
}

@Composable
fun AppNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.ProductList.route,
    ) {
        composable(
            route = Screen.ProductDetail.route,
            arguments = listOf(
                navArgument(Screen.ProductDetail.argument) {
                    type = NavType.LongType
                },
            ),
            deepLinks = listOf(
                navDeepLink {
                    uriPattern = "https://example.com/product/{productId}"
                },
            ),
        ) { entry ->
            val id = entry.arguments
                ?.takeIf { it.containsKey(Screen.ProductDetail.argument) }
                ?.getLong(Screen.ProductDetail.argument)

            if (id == null || id <= 0L) {
                InvalidProductLinkScreen()
                return@composable
            }

            // The detail route must still show NotFound if this ID is absent.
            ProductDetailRoute(productId = id)
        }
    }
}
```

Add the matching intent filter to the activity in `AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="example.com"
            android:pathPrefix="/product" />
    </intent-filter>
</activity>
```

For verified HTTPS App Links, publish `https://example.com/.well-known/assetlinks.json` with the app package name and the SHA-256 fingerprint of the signing certificate. The URI pattern, manifest host/path, and asset-links domain must agree. If the activity uses `singleTop` and receives a new intent while already running, forward that intent to the `NavController` with `handleDeepLink` (or let the app’s existing Navigation host integration do so); do not manually parse the URL into an arbitrary route.

