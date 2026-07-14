Use `StatefulShellRoute.indexedStack`. Give each tab its own `StatefulShellBranch` and navigator key. The indexed stack keeps inactive branch navigators alive, so an Orders detail page remains on that tab's stack while the user visits Profile.

```dart
final rootKey = GlobalKey<NavigatorState>();
final homeKey = GlobalKey<NavigatorState>();
final ordersKey = GlobalKey<NavigatorState>();
final profileKey = GlobalKey<NavigatorState>();

final router = GoRouter(
  navigatorKey: rootKey,
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return AppScaffold(navigationShell: navigationShell);
      },
      branches: [
        StatefulShellBranch(
          navigatorKey: homeKey,
          routes: [
            GoRoute(path: '/home', builder: (_, __) => const HomePage()),
          ],
        ),
        StatefulShellBranch(
          navigatorKey: ordersKey,
          routes: [
            GoRoute(
              path: '/orders',
              builder: (_, __) => const OrdersPage(),
              routes: [
                GoRoute(
                  path: ':orderId',
                  builder: (_, state) => OrderDetailPage(
                    orderId: state.pathParameters['orderId']!,
                  ),
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          navigatorKey: profileKey,
          routes: [
            GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
          ],
        ),
      ],
    ),
  ],
);

class AppScaffold extends StatelessWidget {
  const AppScaffold({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Orders'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
```

Navigate within a branch normally, for example `context.push('/orders/42')`. Switching to another branch does not replace the Orders navigator; switching back restores its detail page. Passing `initialLocation: true` only when the user taps the already-selected tab gives the common behavior of popping that branch back to its root. Use a root navigator key and `parentNavigatorKey: rootKey` only for pages that should cover the entire tab shell, such as a global modal or full-screen flow.

