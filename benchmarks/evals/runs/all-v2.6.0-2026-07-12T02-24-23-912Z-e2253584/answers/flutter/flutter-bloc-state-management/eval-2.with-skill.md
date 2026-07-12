Model this as an `OrdersBloc` with explicit loading, success, and failure states. Keep the retry action as an event, show the spinner from `BlocBuilder`, and keep side effects out of the builder.

```dart
import 'package:bloc/bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'orders_bloc.freezed.dart';
part 'orders_event.dart';
part 'orders_state.dart';

class OrdersBloc extends Bloc<OrdersEvent, OrdersState> {
  OrdersBloc(this._repository) : super(const OrdersState.initial()) {
    on<_Started>(_onStarted);
    on<_RetryRequested>(_onRetryRequested);
  }

  final OrdersRepository _repository;

  Future<void> _onStarted(
    _Started event,
    Emitter<OrdersState> emit,
  ) async {
    await _fetchOrders(emit);
  }

  Future<void> _onRetryRequested(
    _RetryRequested event,
    Emitter<OrdersState> emit,
  ) async {
    await _fetchOrders(emit);
  }

  Future<void> _fetchOrders(Emitter<OrdersState> emit) async {
    emit(const OrdersState.loading());

    try {
      final orders = await _repository.fetchOrders();
      emit(OrdersState.success(orders: orders));
    } catch (error, stackTrace) {
      addError(error, stackTrace);
      emit(
        const OrdersState.failure(
          message: 'Failed to load orders. Please try again.',
        ),
      );
    }
  }
}
```

```dart
part of 'orders_bloc.dart';

@freezed
class OrdersEvent with _$OrdersEvent {
  const factory OrdersEvent.started() = _Started;
  const factory OrdersEvent.retryRequested() = _RetryRequested;
}
```

```dart
part of 'orders_bloc.dart';

@freezed
class OrdersState with _$OrdersState {
  const factory OrdersState.initial() = _Initial;
  const factory OrdersState.loading() = _Loading;
  const factory OrdersState.success({
    required List<Order> orders,
  }) = _Success;
  const factory OrdersState.failure({
    required String message,
  }) = _Failure;
}
```

Example UI:

```dart
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) =>
          OrdersBloc(context.read<OrdersRepository>())
            ..add(const OrdersEvent.started()),
      child: BlocBuilder<OrdersBloc, OrdersState>(
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
                  title: Text('Order #${order.id}'),
                  subtitle: Text(order.statusLabel),
                );
              },
            ),
            failure: (message) => Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(message),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      context
                          .read<OrdersBloc>()
                          .add(const OrdersEvent.retryRequested());
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
```

Why this is the correct BLoC approach:

- Loading spinner is controlled by `OrdersState.loading`.
- Successful fetch maps to `OrdersState.success` with the returned list.
- Failures map to a UI-visible `failure` state because this is a user-critical error.
- Retry is represented as an event, not inline imperative fetch logic in the widget.
- `BlocBuilder` only renders state; snackbars/navigation would belong in `BlocListener`.

Minimum `blocTest` coverage:

```dart
blocTest<OrdersBloc, OrdersState>(
  'emits loading then success when fetch succeeds',
  build: () {
    when(() => repository.fetchOrders())
        .thenAnswer((_) async => [const Order(id: '123', statusLabel: 'Paid')]);
    return OrdersBloc(repository);
  },
  act: (bloc) => bloc.add(const OrdersEvent.started()),
  expect: () => [
    const OrdersState.loading(),
    OrdersState.success(
      orders: [const Order(id: '123', statusLabel: 'Paid')],
    ),
  ],
);

blocTest<OrdersBloc, OrdersState>(
  'emits loading then failure when fetch fails',
  build: () {
    when(() => repository.fetchOrders()).thenThrow(Exception('timeout'));
    return OrdersBloc(repository);
  },
  act: (bloc) => bloc.add(const OrdersEvent.started()),
  expect: () => [
    const OrdersState.loading(),
    const OrdersState.failure(
      message: 'Failed to load orders. Please try again.',
    ),
  ],
);

blocTest<OrdersBloc, OrdersState>(
  'retries after failure',
  build: () {
    when(() => repository.fetchOrders()).thenAnswer(
      (_) async => [const Order(id: '456', statusLabel: 'Shipped')],
    );
    return OrdersBloc(repository);
  },
  seed: () => const OrdersState.failure(
    message: 'Failed to load orders. Please try again.',
  ),
  act: (bloc) => bloc.add(const OrdersEvent.retryRequested()),
  expect: () => [
    const OrdersState.loading(),
    OrdersState.success(
      orders: [const Order(id: '456', statusLabel: 'Shipped')],
    ),
  ],
);
```

