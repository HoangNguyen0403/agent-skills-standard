# Why manual fragment transactions are a problem

`fragment.beginTransaction().replace(...).commit()` bypasses the Navigation Component. It leaves navigation destinations, back-stack behavior, SafeArgs data contracts, deep links, and lifecycle handling split between manual code and the navigation graph. That can produce inconsistent back navigation and makes flows harder to reason about.

Define the destination and an action in the XML graph, then navigate through the `NavController`:

```kotlin
findNavController().navigate(
    R.id.action_productListFragment_to_productDetailFragment
)
```

When data is required, use the generated SafeArgs `Directions` class instead of a raw `Bundle`:

```kotlin
findNavController().navigate(
    ProductListFragmentDirections
        .actionProductListFragmentToProductDetailFragment(productId)
)
```

Manual `commit()` is only appropriate when deliberately managing a separate navigation system; it should not be used for destinations owned by the app’s `NavHostFragment`.

