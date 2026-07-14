Use `androidx.navigation:navigation-compose` and keep the route contract in a sealed type. The list UI should emit a product ID callback; it should not receive a `NavController` directly.

```kotlin
sealed class Screen {
    abstract val route: String

    data object ProductList : Screen() {
        override val route = "products"
    }

    data class ProductDetail(val productId: Long) : Screen() {
        override val route: String
            get() = "product/$productId"

        companion object {
            const val pattern = "product/{productId}"
            const val argument = "productId"
        }
    }
}
```

Register the argument-bearing destination with its pattern, and construct the concrete route only after validating the ID:

```kotlin
@Composable
fun AppNavHost() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.ProductList.route,
    ) {
        composable(Screen.ProductList.route) {
            ProductListScreen(
                onProductClick = { id ->
                    if (id > 0L) {
                        navController.navigate(Screen.ProductDetail(id).route)
                    }
                },
            )
        }

        composable(
            route = Screen.ProductDetail.pattern,
            arguments = listOf(
                navArgument(Screen.ProductDetail.argument) {
                    type = NavType.LongType
                },
            ),
        ) { entry ->
            val args = entry.arguments
            val productId = args
                ?.takeIf { it.containsKey(Screen.ProductDetail.argument) }
                ?.getLong(Screen.ProductDetail.argument)

            if (productId == null || productId <= 0L) {
                InvalidProductLinkScreen()
                return@composable
            }

            ProductDetailRoute(productId = productId)
        }
    }
}
```

`ProductDetailRoute` should load the product by ID and render a not-found state when the repository has no matching product. That prevents a syntactically valid navigation argument from being treated as proof that the resource exists.

