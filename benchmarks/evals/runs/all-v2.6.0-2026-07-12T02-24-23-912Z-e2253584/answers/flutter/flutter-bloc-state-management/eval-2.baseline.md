Model this as a small BLoC with four UI states: initial/loading/success/failure. Trigger a fetch event, render a spinner while loading, render the orders on success, and show an error with a retry button on failure.

Example:

```dart
import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

class Order extends Equatable {
  final String id;
  final String title;

  const Order({required this.id, required this.title});

  @override
  List<Object?> get props => [id, title];
}

abstract class OrdersRepository {
  Future<List<Order>> fetchOrders();
}

sealed class OrdersEvent extends Equatable {
  const OrdersEvent();

  @override
  List<Object?> get props => [];
}

class OrdersRequested extends OrdersEvent {}

class OrdersRetryRequested extends OrdersEvent {}

sealed class OrdersState extends Equatable {
  const OrdersState();

  @override
  List<Object?> get props => [];
}

class OrdersInitial extends OrdersState {}

class OrdersLoadInProgress extends OrdersState {}

class OrdersLoadSuccess extends OrdersState {
  final List<Order> orders;

  const OrdersLoadSuccess(this.orders);

  @override
  List<Object?> get props => [orders];
}

class OrdersLoadFailure extends OrdersState {
  final String message;

  const OrdersLoadFailure(this.message);

  @override
  List<Object?> get props => [message];
}

class OrdersBloc extends Bloc<OrdersEvent, OrdersState> {
  OrdersBloc({required this.repository}) : super(OrdersInitial()) {
    on<OrdersRequested>(_onRequested);
    on<OrdersRetryRequested>(_onRequested);
  }

  final OrdersRepository repository;

  Future<void> _onRequested(
    OrdersEvent event,
    Emitter<OrdersState> emit,
  ) async {
    emit(OrdersLoadInProgress());

    try {
      final orders = await repository.fetchOrders();
      emit(OrdersLoadSuccess(orders));
    } catch (_) {
      emit(const OrdersLoadFailure(
        'Could not load orders. Please try again.',
      ));
    }
  }
}

class OrdersPage extends StatelessWidget {
  const OrdersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => OrdersBloc(
        repository: context.read<OrdersRepository>(),
      )..add(OrdersRequested()),
      child: Scaffold(
        appBar: AppBar(title: const Text('Orders')),
        body: BlocBuilder<OrdersBloc, OrdersState>(
          builder: (context, state) {
            if (state is OrdersLoadInProgress) {
              return const Center(
                child: CircularProgressIndicator(),
              );
            }

            if (state is OrdersLoadSuccess) {
              if (state.orders.isEmpty) {
                return const Center(child: Text('No orders found.'));
              }

              return ListView.separated(
                itemCount: state.orders.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final order = state.orders[index];
                  return ListTile(
                    title: Text(order.title),
                    subtitle: Text('Order #${order.id}'),
                  );
                },
              );
            }

            if (state is OrdersLoadFailure) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: () {
                        context
                            .read<OrdersBloc>()
                            .add(OrdersRetryRequested());
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              );
            }

            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}
```

Behavior summary:

- page opens and dispatches `OrdersRequested`
- bloc emits `OrdersLoadInProgress`, so the UI shows a spinner
- on success, bloc emits `OrdersLoadSuccess` and the list is rendered
- on failure, bloc emits `OrdersLoadFailure` and the UI shows an error plus retry button
- tapping retry dispatches `OrdersRetryRequested`, which runs the same fetch flow again

This keeps networking logic in the bloc/repository layer and keeps the widget focused on rendering states.

