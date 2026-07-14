Use `go_router_builder` to generate route classes. A path parameter declared in a typed route constructor is required when constructing that route, so callers cannot navigate to an order detail route without an `orderId`.

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:go_router_builder/go_router_builder.dart';

part 'app_routes.g.dart';

@TypedGoRoute<HomeRoute>(path: '/')
class HomeRoute extends GoRouteData {
  const HomeRoute();

  @override
  Widget build(BuildContext context, GoRouterState state) => const HomePage();
}

@TypedGoRoute<OrderDetailRoute>(path: '/orders/:orderId')
class OrderDetailRoute extends GoRouteData {
  const OrderDetailRoute({required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, GoRouterState state) {
    return OrderDetailPage(orderId: orderId);
  }
}

final router = GoRouter(routes: $appRoutes);
```

Run the generator after adding or changing annotated routes:

```bash
dart run build_runner build --delete-conflicting-outputs
```

Then navigate through the generated typed API:

```dart
OrderDetailRoute(orderId: order.id).go(context);
// or, to retain the current page in the back stack:
OrderDetailRoute(orderId: order.id).push(context);
```

The required named constructor argument gives compile-time enforcement at every typed call site. Keep the path parameter as a stable identifier (usually a string); validate that the order exists and that the current user may view it inside the destination's data-loading layer, because a user can still enter a URL manually. Query parameters can be modeled with optional constructor fields, while parameters that identify the route should remain required path parameters.

