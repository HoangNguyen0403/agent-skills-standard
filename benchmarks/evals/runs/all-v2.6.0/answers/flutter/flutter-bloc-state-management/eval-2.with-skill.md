Assumption: the app uses `flutter_bloc`, `freezed`, and an `OrderRepository.fetchOrders()` API method.

```dart
// orders_event.dart
@freezed
sealed class OrdersEvent with _$OrdersEvent {
  const factory OrdersEvent.started() = _Started;
  const factory OrdersEvent.retryRequested() = _RetryRequested;
}
```

```dart
// orders_state.dart
@freezed
sealed class OrdersState with _$OrdersState {
  const factory OrdersState.initial() = _Initial;
  const factory OrdersState.loading() = _Loading;
  const factory OrdersState.success(List<Order> orders) = _Success;
  const factory OrdersState.failure(String message) = _Failure;
}
```

```dart
// orders_bloc.dart
class OrdersBloc extends Bloc<OrdersEvent, OrdersState> {
  OrdersBloc(this.repository) : super(const OrdersState.initial()) {
    on<_Started>((event, emit) async => _fetchOrders(emit));
    on<_RetryRequested>((event, emit) async => _fetchOrders(emit));
  }

  final OrderRepository repository;

  Future<void> _fetchOrders(Emitter<OrdersState> emit) async {
    emit(const OrdersState.loading());

    try {
      final orders = await repository.fetchOrders();
      emit(OrdersState.success(orders));
    } catch (error, stackTrace) {
      addError(error, stackTrace);
      emit(OrdersState.failure(error.toString()));
    }
  }
}
```

```dart
class OrdersPage extends StatelessWidget {
  const OrdersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => OrdersBloc(
        context.read<OrderRepository>(),
      )..add(const OrdersEvent.started()),
      child: Scaffold(
        appBar: AppBar(title: const Text('Orders')),
        body: BlocBuilder<OrdersBloc, OrdersState>(
          buildWhen: (previous, current) => previous != current,
          builder: (context, state) {
            return state.when(
              initial: () => const SizedBox.shrink(),
              loading: () => const Center(
                child: CircularProgressIndicator(),
              ),
              success: (orders) => ListView.builder(
                itemCount: orders.length,
                itemBuilder: (context, index) {
                  final order = orders[index];

                  return ListTile(
                    title: Text('Order ${order.id}'),
                    subtitle: Text(order.status),
                  );
                },
              ),
              failure: (message) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Failed to load orders: $message'),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () {
                        context.read<OrdersBloc>().add(
                              const OrdersEvent.retryRequested(),
                            );
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
```

Test both required flows with `blocTest`:

```dart
blocTest<OrdersBloc, OrdersState>(
  'loads orders successfully',
  build: () => OrdersBloc(FakeOrderRepository.success()),
  act: (bloc) => bloc.add(const OrdersEvent.started()),
  expect: () => [
    const OrdersState.loading(),
    OrdersState.success(fakeOrders),
  ],
);

blocTest<OrdersBloc, OrdersState>(
  'emits failure when loading orders fails',
  build: () => OrdersBloc(FakeOrderRepository.failure()),
  act: (bloc) => bloc.add(const OrdersEvent.started()),
  expect: () => [
    const OrdersState.loading(),
    const OrdersState.failure('Request failed'),
  ],
);
```

Use `await` for the API request; do not use `.then()` on `emit()`.
