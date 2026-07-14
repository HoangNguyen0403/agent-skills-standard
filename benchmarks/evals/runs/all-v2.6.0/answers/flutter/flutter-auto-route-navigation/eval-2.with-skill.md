With `auto_route`, you pass route parameters by defining them on the page constructor and then navigating with the generated typed route class.

First, annotate the page and give it an `orderId` parameter:

```dart
import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';

@RoutePage()
class OrderDetailPage extends StatelessWidget {
  const OrderDetailPage({
    super.key,
    required this.orderId,
  });

  final String orderId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Detail')),
      body: Center(
        child: Text('Showing order: $orderId'),
      ),
    );
  }
}
```

Add the route to your router:

```dart
@AutoRouterConfig()
class AppRouter extends _$AppRouter {
  @override
  List<AutoRoute> get routes => [
    AutoRoute(page: HomeRoute.page, initial: true),
    AutoRoute(page: OrderDetailRoute.page),
  ];
}
```

After code generation, navigate with the generated route class:

```dart
context.pushRoute(
  OrderDetailRoute(orderId: 'ORD-12345'),
);
```

You can also replace instead of push if that better matches the flow:

```dart
context.replaceRoute(
  OrderDetailRoute(orderId: 'ORD-12345'),
);
```

This is preferred because:

- the route is typed,
- the parameter is validated by the constructor,
- there are no hard-coded string route names,
- refactors stay safe because generated APIs change with the page definition.

So the short answer is: define `final String orderId` on `OrderDetailPage`, annotate the page with `@RoutePage()`, register `OrderDetailRoute.page`, then call `context.pushRoute(OrderDetailRoute(orderId: ...))`.

