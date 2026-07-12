It may work mechanically, but it is not a good navigation contract. A raw interpolated route such as `"product/$id"` spreads route syntax through the UI, makes argument handling easy to get wrong, and conflicts with the project’s sealed-route rule.

Define the pattern and route construction together in a sealed type, then use that type at both call sites:

```kotlin
sealed class Screen {
    data object ProductList : Screen() {
        val route = "products"
    }

    data class ProductDetail(val productId: Long) : Screen() {
        val route: String
            get() = "product/$productId"

        companion object {
            const val pattern = "product/{productId}"
            const val argument = "productId"
        }
    }
}

// From the list screen:
if (id > 0L) {
    navController.navigate(Screen.ProductDetail(id).route)
}

// In the NavHost:
composable(
    route = Screen.ProductDetail.pattern,
    arguments = listOf(
        navArgument(Screen.ProductDetail.argument) {
            type = NavType.LongType
        },
    ),
) { entry ->
    val productId = entry.arguments
        ?.takeIf { it.containsKey(Screen.ProductDetail.argument) }
        ?.getLong(Screen.ProductDetail.argument)

    if (productId == null || productId <= 0L) {
        InvalidProductLinkScreen()
        return@composable
    }

    ProductDetailRoute(productId)
}
```

For a string ID, encode it when building the concrete route and decode/validate it at the destination. In either case, validate the argument and confirm the product exists before rendering the detail screen; a matched route alone is not sufficient.

