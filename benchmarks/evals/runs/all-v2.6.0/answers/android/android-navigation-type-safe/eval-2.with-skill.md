Represent the detail destination as a serializable data class whose argument is a `Long`:

```kotlin
@Serializable
sealed interface ProductScreen {
    @Serializable
    data object List : ProductScreen

    @Serializable
    data class Detail(val productId: Long) : ProductScreen
}
```

Register and navigate to it using the typed APIs:

```kotlin
NavHost(
    navController = navController,
    startDestination = ProductScreen.List,
) {
    composable<ProductScreen.List> {
        ProductListScreen(
            onProductClick = { productId ->
                navController.navigate(ProductScreen.Detail(productId))
            },
        )
    }

    composable<ProductScreen.Detail> { backStackEntry ->
        val route = backStackEntry.toRoute<ProductScreen.Detail>()
        ProductDetailScreen(productId = route.productId)
    }
}
```

`Long` is part of the typed route data, so callers pass the actual `Long` value and the destination reads it through `toRoute<ProductScreen.Detail>()`. Do not concatenate `productId` into a string route or manually read it from a `Bundle`. The screen should receive the decoded `productId` (and navigation callbacks) as ordinary parameters.

