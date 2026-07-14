# Deep links with Compose Navigation

Register the external URI pattern on the destination that should receive it.
The placeholder must use the same argument name as the composable route:

```kotlin
private const val ProductDetailRoute = "product/{productId}"

NavHost(navController, startDestination = "home") {
    composable("home") { HomeScreen() }

    composable(
        route = ProductDetailRoute,
        arguments = listOf(
            navArgument("productId") { type = NavType.StringType }
        ),
        deepLinks = listOf(
            navDeepLink {
                uriPattern = "https://example.com/products/{productId}"
            },
            navDeepLink {
                uriPattern = "myapp://product/{productId}"
            }
        )
    ) { entry ->
        val id = entry.arguments?.getString("productId")
        if (id != null) {
            ProductDetailScreen(productId = id)
        } else {
            InvalidProductLinkScreen()
        }
    }
}
```

For a link to launch the app, declare a matching intent filter on the activity
that hosts the `NavHost`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="example.com"
            android:pathPrefix="/products" />
    </intent-filter>
</activity>
```

When Android starts `MainActivity` with a matching `ACTION_VIEW` intent, the
Navigation host processes the intent and creates the destination back stack
for the matching deep link. The app should still validate the extracted ID and
load the product from the repository; a URI is not proof that the product
exists or that the user is authorized to see it.

For verified HTTPS App Links, add `android:autoVerify="true"` and publish the
correct `assetlinks.json` for the application on the domain. Without domain
verification, the link may still resolve but Android can show a chooser or
open the browser depending on the user's defaults. A custom scheme such as
`myapp` is useful for app-to-app links but is not ownership-verified.

Test the complete path, not just an in-app `navigate` call. For example:

```bash
adb shell am start \
  -a android.intent.action.VIEW \
  -c android.intent.category.BROWSABLE \
  -d 'https://example.com/products/42'
```

Also test a cold start, an already-running app, a missing/unknown ID, and IDs
containing characters that require URI encoding. If the deep link is in a
nested navigation graph, ensure that graph is included in the `NavHost` and
that the deep-link declaration is attached to the actual destination route.

