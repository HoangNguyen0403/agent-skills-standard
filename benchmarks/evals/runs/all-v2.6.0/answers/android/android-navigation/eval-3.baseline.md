# Using `product/$id` as a Compose Navigation route

It depends on where the string is used. A concrete route such as
`"product/$id"` is appropriate as the destination passed to `navigate` when
the destination was declared with an argument placeholder:

```kotlin
composable(
    route = "product/{id}",
    arguments = listOf(navArgument("id") {
        type = NavType.StringType
    })
) { entry ->
    val id = entry.arguments?.getString("id")
    if (id != null) ProductDetailScreen(id)
}

navController.navigate("product/${Uri.encode(id)}")
```

The declaration and the navigation call have different jobs:

- `product/{id}` declares one destination and its argument contract.
- `product/123` is the concrete URI that matches that destination for one
  navigation event.

Do not normally declare the composable as `composable("product/$id")`. That
uses the current value while building the graph, effectively making a
value-specific route. It does not define a reusable `id` argument, can create
duplicate or stale routes, and will not match arbitrary product IDs or
deep-link patterns as intended.

Use `Uri.encode(id)` before interpolation if the ID is not guaranteed to be a
URI-safe path segment. Never interpolate an entire object or untrusted
serialized data into a route. Pass a stable identifier and reload the product
in the detail ViewModel.

For projects using a recent Navigation Compose version, typed routes are an
alternative that avoids manually keeping the placeholder and argument name in
sync:

```kotlin
@Serializable
data class ProductDetail(val id: String)

composable<ProductDetail> { entry ->
    val args = entry.toRoute<ProductDetail>()
    ProductDetailScreen(args.id)
}

navController.navigate(ProductDetail(id))
```

The typed form requires the Navigation Compose typed-route APIs and Kotlin
serialization setup. Whichever form is used, define the route once, keep the
argument type explicit, validate missing or invalid IDs, and avoid putting
secrets in navigation URLs.

