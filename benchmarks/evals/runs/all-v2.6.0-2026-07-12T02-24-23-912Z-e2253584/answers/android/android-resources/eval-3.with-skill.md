Prefer an Android `VectorDrawable` XML resource for ordinary app icons, especially simple or monochrome icons. Store it under `res/drawable/`, for example `res/drawable/ic_cart.xml`, and reference it as a drawable:

```xml
<ImageView
    android:layout_width="24dp"
    android:layout_height="24dp"
    android:contentDescription="@string/cart_icon_description"
    android:src="@drawable/ic_cart" />
```

In Compose, load the same resource with `painterResource(R.drawable.ic_cart)`. Vectors scale cleanly across density buckets, avoid maintaining multiple PNG sizes, and can be tinted through theme/design tokens. Keep vector paths reasonably simple because very complex vectors can increase parsing and rendering cost.

Use PNG or another raster format when the asset is inherently pixel-based—such as a photograph, texture, or complex artwork—or when the source cannot be represented efficiently as a vector. For raster assets, provide appropriate density-specific resources (or an appropriately optimized raster format) so Android does not have to scale a low-resolution image. Do not use hardcoded layout colors for icon styling; use theme tokens and `values-night/` or Material theme support for dark mode.

