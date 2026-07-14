The lag is likely because `Column` builds all 500 `ProductCard`s at once, so Flutter has to layout, paint, and keep every child alive during scroll.

Use `ListView.builder` instead so items are built lazily and recycled:

```dart
ListView.builder(
  itemCount: products.length,
  itemBuilder: (context, index) {
    final product = products[index];
    return ProductCard(
      key: ValueKey(product.id),
      product: product,
    );
  },
)
```

Also make sure:

- `ProductCard` uses `const` where possible
- each row has a stable `ValueKey`
- heavy sorting/filtering/image prep is not done inside `build()`
- controllers/streams are disposed properly

If `ProductCard` is visually complex, consider wrapping it in `RepaintBoundary`. If images are involved, resize/cache them appropriately.

