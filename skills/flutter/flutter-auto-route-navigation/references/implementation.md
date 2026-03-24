# AutoRoute Implementation Examples

## Nested Routes & Tabs

```dart
// Navigate to a tab with a specific child route active
context.navigateTo(
  OrdersTabRoute(children: [ViewByOrdersPageRoute()]),
);
```

## Router Configuration

```dart
@AutoRouterConfig()
class AppRouter extends _$AppRouter {
  @override
  List<AutoRoute> get routes => [
    AutoRoute(page: HomeRoute.page, initial: true),
    AutoRoute(page: OrderDetailRoute.page, guards: [AuthGuard()]),
  ];
}
```
