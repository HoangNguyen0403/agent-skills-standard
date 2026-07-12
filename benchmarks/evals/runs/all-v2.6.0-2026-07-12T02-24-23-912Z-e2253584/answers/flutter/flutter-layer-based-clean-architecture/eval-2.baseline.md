Remove the HTTP call from the widget. A widget should render state and send user intent to a presentation controller; it should not know routes, HTTP clients, response formats, or transport errors.

Define an `OrderRepository` contract in the domain layer, for example:

```dart
abstract interface class OrderRepository {
  Future<List<Order>> getOrders();
}

class GetOrders {
  const GetOrders(this._repository);
  final OrderRepository _repository;

  Future<List<Order>> call() => _repository.getOrders();
}
```

Implement `OrderRepository` in the data layer. Its remote data source uses Dio to request `/orders`, validates/parses the payload into DTOs or models, and the repository maps those models to domain `Order` entities. Network and parsing failures should be translated to application-specific failures or a typed result, rather than leaked as Dio-specific behavior.

Inject `GetOrders` into a ViewModel/Cubit/Bloc. That controller invokes the use case, emits loading/success/error UI state, and is the only object the widget talks to:

```dart
// Widget event handler
context.read<OrdersCubit>().loadOrders();
```

The dependency-injection composition root wires `Dio` -> remote data source -> repository implementation -> `GetOrders` -> controller. This keeps the widget testable with a fake controller and allows the data implementation to change without rewriting UI.

