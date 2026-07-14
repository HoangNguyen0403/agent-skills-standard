Use a `GoRouteData` route with a required constructor parameter. The `go_router_builder` generator maps `orderId` to the `:orderId` segment and makes an untyped navigation call unnecessary.

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

part 'app_router.g.dart';

@TypedGoRoute<OrderDetailRoute>(path: '/orders/:orderId')
class OrderDetailRoute extends GoRouteData {
  const OrderDetailRoute({required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, GoRouterState state) {
    return OrderDetailScreen(orderId: orderId);
  }
}

class OrderDetailScreen extends StatelessWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Order details')),
        body: Center(child: Text('Order: $orderId')),
      );
}

final GoRouter appRouter = GoRouter(routes: $appRoutes);
```

Navigate only through the route type:

```dart
OrderDetailRoute(orderId: order.id).push(context);
// or replace the current location:
OrderDetailRoute(orderId: order.id).go(context);
```

`orderId` cannot be omitted at the call site. Register `appRouter` once in dependency injection and pass it to `MaterialApp.router`; do not construct routers per screen or call `context.go('/orders/...')` with raw paths.

