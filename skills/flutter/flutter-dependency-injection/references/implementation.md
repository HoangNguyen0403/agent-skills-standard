# Dependency Injection Implementation Examples

## Registration Example

```dart
@module
abstract class NetworkModule {
  @lazySingleton
  Dio get dio => Dio(BaseOptions(baseUrl: 'https://api.example.com'));
}

@LazySingleton(as: IOrderRepository)
class OrderRepositoryImpl implements IOrderRepository {
  final Dio _dio;
  OrderRepositoryImpl(this._dio);
}
```

## Test Mock Swap

```dart
setUp(() {
  getIt.unregister<IOrderRepository>();
  getIt.registerLazySingleton<IOrderRepository>(() => MockOrderRepository());
});
```
