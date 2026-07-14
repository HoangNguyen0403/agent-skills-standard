Define a typed argument in the navigation graph and pass only the stable product ID.

```xml
<fragment
    android:id="@+id/productListFragment"
    android:name="com.example.ProductListFragment">
    <action
        android:id="@+id/action_productList_to_productDetail"
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

With the Navigation Safe Args plugin, navigate using the generated direction:

```kotlin
val action = ProductListFragmentDirections
    .actionProductListToProductDetail(product.id)
findNavController().navigate(action)
```

Read it in the detail fragment with the generated arguments class:

```kotlin
private val args: ProductDetailFragmentArgs by navArgs()

override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    viewModel.loadProduct(args.productId)
}
```

This gives the argument a declared type and catches many wiring errors at build time. Do not pass a full product object unless there is a strong reason; passing an ID keeps navigation state small and lets the detail screen load current data from its repository or ViewModel. If Safe Args is unavailable, use an explicit `Bundle` with the same graph argument, validate the value, and handle a missing/invalid ID rather than relying on an untyped key.

