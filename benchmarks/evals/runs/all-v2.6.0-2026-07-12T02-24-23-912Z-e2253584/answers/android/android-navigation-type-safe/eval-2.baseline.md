# Passing a `Long` product ID

Model the detail destination as a serializable data class whose property is a `Long`. Construct that destination when navigating and decode it from the `NavBackStackEntry` with `toRoute()`.

```kotlin
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.toRoute
import kotlinx.serialization.Serializable

@Serializable
data object ProductList

@Serializable
data class ProductDetail(val productId: Long)

NavHost(
    navController = navController,
    startDestination = ProductList,
) {
    composable<ProductList> {
        ProductListScreen(
            onProductClick = { id ->
                navController.navigate(ProductDetail(productId = id))
            },
        )
    }

    composable<ProductDetail> { backStackEntry ->
        val args = backStackEntry.toRoute<ProductDetail>()
        ProductDetailScreen(productId = args.productId)
    }
}
```

The `Long` is part of the typed route contract; do not build a string such as `"product/$id"` or read a manually named bundle argument. `toRoute<ProductDetail>()` deserializes the value back to a `Long`, and the destination type should be registered with `composable<ProductDetail>`.

The module must have Kotlin serialization enabled and use a Navigation Compose version that supports type-safe destinations (2.8 or later). Pass the ID, or preferably a repository/ViewModel-backed screen state keyed by that ID, rather than passing a large product object through navigation. A detail screen should handle an ID that no longer resolves by showing an appropriate not-found/error state.

