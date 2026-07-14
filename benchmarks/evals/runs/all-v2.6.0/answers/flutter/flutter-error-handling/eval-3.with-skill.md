Define a typed, domain-specific `@freezed` failure and expose a localized UI message rather than returning a raw string:

```dart
@freezed
class ProductFailure with _$ProductFailure {
  const factory ProductFailure.outOfStock({
    required String productName,
  }) = OutOfStockFailure;
}

extension ProductFailureMessage on ProductFailure {
  TRObject get failureMessage => when(
        outOfStock: (productName) =>
            TR.productOutOfStock(productName: productName),
      );
}
```

The repository can return `Left(ProductFailure.outOfStock(productName: productName))`, and the BLoC can surface `failure.failureMessage` through `fold`.

