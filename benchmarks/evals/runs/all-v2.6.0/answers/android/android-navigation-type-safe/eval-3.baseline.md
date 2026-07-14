# Passing navigation actions to child composables

Usually, no. A reusable child composable should not receive a `NavController` directly. The controller couples that UI to the app's navigation implementation and route types, makes previews and unit tests harder, and lets a low-level component perform navigation it does not own.

Keep the controller at the navigation boundary and expose intent-based callbacks:

```kotlin
@Composable
fun ProductRoute(navController: NavHostController) {
    ProductScreen(
        onProductSelected = { productId ->
            navController.navigate(ProductDetail(productId))
        },
        onBack = { navController.popBackStack() },
    )
}

@Composable
fun ProductScreen(
    onProductSelected: (Long) -> Unit,
    onBack: () -> Unit,
) {
    // Render state and invoke callbacks from click handlers.
}
```

The `NavHost` (or a route-level wrapper such as `ProductRoute`) owns destination registration and translates UI events into navigation commands. The child receives only the data it renders and callbacks describing user intent. This also keeps route construction, back-stack policy, and navigation options such as `popUpTo` out of the reusable UI.

Passing a controller can be acceptable at a narrowly scoped screen/navigation boundary in a small application, but it is a poor default for leaf or reusable composables. For deeper trees, pass callbacks down or use a screen-scoped coordinator rather than exposing the controller globally. ViewModels should generally emit navigation events or intents; they should not require a `NavController` either.

