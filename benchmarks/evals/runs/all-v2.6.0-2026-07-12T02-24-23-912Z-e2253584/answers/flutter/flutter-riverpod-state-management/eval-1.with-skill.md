```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'product_provider.g.dart';

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.price,
  });

  final String id;
  final String name;
  final double price;
}

abstract class ProductRepository {
  Future<List<Product>> fetchProducts();
}

@riverpod
ProductRepository productRepository(ProductRepositoryRef ref) {
  throw UnimplementedError('Override productRepositoryProvider in ProviderScope');
}

@riverpod
Future<List<Product>> products(ProductsRef ref) async {
  final repository = ref.watch(productRepositoryProvider);
  return repository.fetchProducts();
}
```

Use it in the UI with `ref.watch(productsProvider)` and render the result via `AsyncValue.when(...)`.

