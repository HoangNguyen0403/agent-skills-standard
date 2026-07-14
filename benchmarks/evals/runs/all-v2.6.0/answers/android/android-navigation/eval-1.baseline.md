# Passing a product ID with Compose Navigation

Declare a route with an argument placeholder, and put the concrete ID in the
route only when navigating:

```kotlin
private const val ProductDetailRoute = "product/{productId}"

NavHost(
    navController = navController,
    startDestination = "products",
) {
    composable("products") {
        ProductListScreen(
            onProductClick = { product ->
                // Encode values that may contain '/', '?', spaces, or other
                // URI-significant characters.
                navController.navigate(
                    "product/${Uri.encode(product.id)}"
                )
            }
        )
    }

    composable(
        route = ProductDetailRoute,
        arguments = listOf(
            navArgument("productId") {
                type = NavType.StringType
            }
        )
    ) { backStackEntry ->
        val productId = backStackEntry.arguments?.getString("productId")
        if (productId == null) {
            // Handle an invalid/missing argument rather than crashing.
            return@composable
        }

        ProductDetailScreen(productId = productId)
    }
}
```

The imports for this example are `android.net.Uri` and the
`androidx.navigation.*` APIs. If the ID is numeric, declare `NavType.IntType`
and read it with `getInt`, or use a string when IDs can be non-numeric.

The detail screen should normally use the ID to load its data, preferably via
a ViewModel. With a ViewModel scoped to the destination, the ID can also be
read from `SavedStateHandle` using the same argument name:

```kotlin
class ProductDetailViewModel(savedStateHandle: SavedStateHandle) : ViewModel() {
    private val productId: String = checkNotNull(
        savedStateHandle["productId"]
    )

    val product = repository.observeProduct(productId)
}
```

Pass only a small, stable identifier through navigation. Do not put a whole
serialized product or sensitive data in the route; the route can appear in
back-stack state, logs, saved state, and deep-link URLs. The detail ViewModel
can fetch the current product and handle a missing or deleted ID explicitly.

