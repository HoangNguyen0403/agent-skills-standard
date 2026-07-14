Using a `Column` with 500 mapped children builds everything at once, so scrolling gets heavy.

Use a lazily built scrolling list instead, like `ListView.builder`, so only visible items are built.

Example:

```dart
ListView.builder(
  itemCount: products.length,
  itemBuilder: (context, index) {
    return ProductCard(product: products[index]);
  },
)
```

If `ProductCard` is expensive, also check for unnecessary rebuilds and keep widgets as lightweight as possible.

