Define `orderId` as a route argument on `OrderDetailPage`, then navigate with the generated route class.

Example page:

```dart
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
      appBar: AppBar(title: const Text('Order detail')),
      body: Center(child: Text('Order: $orderId')),
    );
  }
}
```

Router setup:

```dart
@AutoRouterConfig()
class AppRouter extends RootStackRouter {
  @override
  List<AutoRoute> get routes => [
        AutoRoute(page: OrderDetailRoute.page),
      ];
}
```

Navigate like this:

```dart
context.router.push(OrderDetailRoute(orderId: 'ORD-123'));
```

Or replace the current page:

```dart
context.router.replace(OrderDetailRoute(orderId: 'ORD-123'));
```

If you prefer a path parameter, configure a path and annotate the field:

```dart
AutoRoute(
  page: OrderDetailRoute.page,
  path: '/orders/:orderId',
)
```

```dart
@RoutePage()
class OrderDetailPage extends StatelessWidget {
  const OrderDetailPage({
    super.key,
    @PathParam('orderId') required this.orderId,
  });

  final String orderId;
}
```

Then you still navigate with:

```dart
context.router.push(OrderDetailRoute(orderId: 'ORD-123'));
```

In short: put `orderId` on the page constructor, let `auto_route` generate `OrderDetailRoute`, and pass the value through that generated route object.

