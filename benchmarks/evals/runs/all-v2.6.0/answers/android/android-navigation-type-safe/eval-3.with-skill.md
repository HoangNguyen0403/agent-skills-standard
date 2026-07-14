Passing a `NavController` directly into child composables is not the recommended structure. Keep the controller in the `NavHost` or navigation-graph layer and hoist navigation events into screen-level callbacks. This keeps screens independent of the navigation implementation and makes them easier to test and reuse.

```kotlin
composable<ProductScreen.List> {
    ProductListScreen(
        onProductClick = { productId ->
            navController.navigate(ProductScreen.Detail(productId))
        },
        onOpenSettings = {
            navController.navigate(SettingsScreen)
        },
    )
}
```

The screen exposes intent rather than a controller:

```kotlin
@Composable
fun ProductListScreen(
    onProductClick: (Long) -> Unit,
    onOpenSettings: () -> Unit,
) {
    // Buttons and list items invoke the callbacks.
}
```

Use the same pattern for back navigation (`onBack: () -> Unit`) and for nested child composables: pass the smallest callback or event handler they need. The navigation graph then maps those callbacks to typed destinations such as `ProductScreen.Detail(productId)`, rather than making UI components know about route strings or `NavController` APIs.

