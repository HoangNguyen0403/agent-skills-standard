To preserve tab state with `auto_route`, structure the bottom bar as nested routes under a parent tabs route. That lets each tab keep its own navigation stack and widget tree alive instead of rebuilding from scratch on every tab switch.

A typical setup looks like this:

```dart
@RoutePage()
class HomeTabsPage extends StatelessWidget {
  const HomeTabsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AutoTabsScaffold(
      routes: const [
        FeedRoute(),
        OrdersRoute(),
        ProfileRoute(),
      ],
      bottomNavigationBuilder: (_, tabsRouter) {
        return BottomNavigationBar(
          currentIndex: tabsRouter.activeIndex,
          onTap: tabsRouter.setActiveIndex,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Feed'),
            BottomNavigationBarItem(icon: Icon(Icons.list), label: 'Orders'),
            BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
          ],
        );
      },
    );
  }
}
```

Router configuration:

```dart
@AutoRouterConfig()
class AppRouter extends _$AppRouter {
  @override
  List<AutoRoute> get routes => [
    AutoRoute(
      page: HomeTabsRoute.page,
      initial: true,
      children: [
        AutoRoute(page: FeedRoute.page),
        AutoRoute(page: OrdersRoute.page),
        AutoRoute(page: ProfileRoute.page),
      ],
    ),
  ];
}
```

Why this preserves state:

- `AutoTabsScaffold` keeps the tab routes mounted.
- Each child route owns its own subtree and navigation history.
- Switching tabs changes the active child route instead of recreating the page from zero.

If your scroll view still resets, make sure the tab page itself also participates in Flutter state preservation. A common pattern is `AutomaticKeepAliveClientMixin`:

```dart
@RoutePage()
class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);

    return ListView.builder(
      itemCount: 100,
      itemBuilder: (_, index) => ListTile(title: Text('Item $index')),
    );
  }
}
```

If needed, add a `PageStorageKey` to the scrollable widget as well:

```dart
ListView.builder(
  key: const PageStorageKey('orders-list'),
  itemCount: 100,
  itemBuilder: (_, index) => ListTile(title: Text('Item $index')),
)
```

In practice, the fix is:

- use nested child routes for the tabs,
- render them through `AutoTabsScaffold`,
- keep each tab page alive with Flutter’s state-preservation tools when the page contains scrollable local UI state.

That combination usually stops the scroll position from resetting when users switch between bottom tabs.

