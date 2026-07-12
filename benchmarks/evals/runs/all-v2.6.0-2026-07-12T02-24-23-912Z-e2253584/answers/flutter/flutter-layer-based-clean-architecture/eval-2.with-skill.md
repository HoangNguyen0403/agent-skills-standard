Remove the HTTP call from the widget. Define an order domain contract, implement the request and DTO mapping in infrastructure, and have a Cubit/BLoC coordinate the use case. The widget should only trigger the event and render state.

```dart
// lib/domain/repositories/order_repository.dart
abstract interface class OrderRepository {
  Future<Either<Failure, List<Order>>> fetchOrders();
}
```

```dart
// lib/infrastructure/datasources/order_remote_data_source.dart
class DioOrderRemoteDataSource implements OrderRemoteDataSource {
  DioOrderRemoteDataSource(this._dio);
  final Dio _dio;

  @override
  Future<List<OrderDto>> fetchOrders() async {
    final response = await _dio.get('/orders');
    return (response.data as List<dynamic>)
        .map((json) => OrderDto.fromJson(json as Map<String, dynamic>))
        .toList();
  }
}

// lib/infrastructure/repositories/order_repository_impl.dart
class OrderRepositoryImpl implements OrderRepository {
  OrderRepositoryImpl(this._remote);
  final OrderRemoteDataSource _remote;

  @override
  Future<Either<Failure, List<Order>>> fetchOrders() async {
    try {
      final dtos = await _remote.fetchOrders();
      return right(dtos.map((dto) => dto.toDomain()).toList());
    } on DioException catch (error) {
      return left(Failure.network(error.message ?? 'Unable to load orders'));
    }
  }
}
```

`OrderDto.toDomain()` maps wire-format fields to the immutable domain `Order`, so neither the generated DTO nor raw JSON crosses the infrastructure boundary.

```dart
// lib/application/orders/orders_cubit.dart
class OrdersCubit extends Cubit<OrdersState> {
  OrdersCubit(this._repository) : super(const OrdersState.initial());
  final OrderRepository _repository;

  Future<void> load() async {
    emit(const OrdersState.loading());
    final result = await _repository.fetchOrders();
    emit(result.fold(
      (failure) => OrdersState.error(failure.message),
      (orders) => OrdersState.loaded(orders),
    ));
  }
}
```

The widget becomes a presentation-only consumer:

```dart
@override
void initState() {
  super.initState();
  context.read<OrdersCubit>().load();
}

@override
Widget build(BuildContext context) => BlocBuilder<OrdersCubit, OrdersState>(
  builder: (context, state) => state.when(
    initial: () => const SizedBox.shrink(),
    loading: () => const Center(child: CircularProgressIndicator()),
    loaded: (orders) => OrdersList(orders: orders),
    error: (message) => ErrorView(message: message),
  ),
);
```

Register `OrderRepository` to `OrderRepositoryImpl` and the Cubit in `get_it`/`BlocProvider`. Presentation depends on the Cubit; the Cubit depends on the domain interface; only infrastructure depends on Dio.

