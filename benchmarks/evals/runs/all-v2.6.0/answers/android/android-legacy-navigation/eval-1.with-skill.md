# Pass a product ID with Safe Args

Use a single host activity with a `NavHostFragment`, define the destination argument in the XML graph, and enable the Navigation Safe Args plugin.

```xml
<fragment
    android:id="@+id/productListFragment"
    android:name="com.example.ProductListFragment">
    <action
        android:id="@+id/action_productListFragment_to_productDetailFragment"
        app:destination="@id/productDetailFragment" />
</fragment>

<fragment
    android:id="@+id/productDetailFragment"
    android:name="com.example.ProductDetailFragment">
    <argument
        android:name="productId"
        app:argType="string" />
</fragment>
```

In the list fragment, navigate with the generated `Directions` class:

```kotlin
val directions = ProductListFragmentDirections
    .actionProductListFragmentToProductDetailFragment(product.id)
findNavController().navigate(directions)
```

Read it in the detail fragment with the generated arguments class:

```kotlin
private val args: ProductDetailFragmentArgs by navArgs()

// args.productId
```

Use `Long` instead of `String` if that is the product ID type. Do not put the ID in a raw `Bundle` key; Safe Args validates the type and generates the navigation contract.

