# Riverpod Implementation Examples

## Provider Definition (Generator-First)

```dart
// products_provider.dart — use @riverpod annotation
@riverpod
class ProductsNotifier extends _$ProductsNotifier {
  @override
  Future<List<Product>> build() async {
    return ref.watch(productRepositoryProvider).getProducts();
  }

  Future<void> addProduct(Product product) async {
    await ref.read(productRepositoryProvider).create(product);
    ref.invalidateSelf(); // Refetch after mutation
  }
}
```

## Consuming Providers

```dart
// products_screen.dart — ConsumerWidget usage
class ProductsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(productsNotifierProvider);

    return productsAsync.when(
      data: (products) => ListView.builder(
        itemCount: products.length,
        itemBuilder: (_, i) => ProductTile(products[i]),
      ),
      loading: () => const CircularProgressIndicator(),
      error: (err, stack) => Text('Error: $err'),
    );
  }
}
```
