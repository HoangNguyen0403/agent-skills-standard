Use a typed `StatefulShellRoute` with one branch per tab. Each branch has its own navigator key, so navigating within Orders does not discard its stack when the user switches to Home or Profile.

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

part 'app_router.g.dart';

@TypedStatefulShellRoute<AppShellRoute>(
  branches: [
    TypedStatefulShellBranch<HomeBranch>(
      routes: [TypedGoRoute<HomeRoute>(path: '/home')],
    ),
    TypedStatefulShellBranch<OrdersBranch>(
      routes: [
        TypedGoRoute<OrdersRoute>(
          path: '/orders',
          routes: [TypedGoRoute<OrderDetailRoute>(path: ':orderId')],
        ),
      ],
    ),
    TypedStatefulShellBranch<ProfileBranch>(
      routes: [TypedGoRoute<ProfileRoute>(path: '/profile')],
    ),
  ],
)
class AppShellRoute extends StatefulShellRouteData {
  const AppShellRoute();

  @override
  Widget builder(
    BuildContext context,
    GoRouterState state,
    StatefulNavigationShell navigationShell,
  ) => AppScaffold(navigationShell: navigationShell);
}

class HomeBranch extends StatefulShellBranchData {
  static final $navigatorKey = GlobalKey<NavigatorState>();
}

class OrdersBranch extends StatefulShellBranchData {
  static final $navigatorKey = GlobalKey<NavigatorState>();
}

class ProfileBranch extends StatefulShellBranchData {
  static final $navigatorKey = GlobalKey<NavigatorState>();
}

class HomeRoute extends GoRouteData {
  const HomeRoute();
  @override
  Widget build(BuildContext context, GoRouterState state) => const HomeScreen();
}

class OrdersRoute extends GoRouteData {
  const OrdersRoute();
  @override
  Widget build(BuildContext context, GoRouterState state) => const OrdersScreen();
}

class OrderDetailRoute extends GoRouteData {
  const OrderDetailRoute({required this.orderId});
  final String orderId;
  @override
  Widget build(BuildContext context, GoRouterState state) =>
      OrderDetailScreen(orderId: orderId);
}

class ProfileRoute extends GoRouteData {
  const ProfileRoute();
  @override
  Widget build(BuildContext context, GoRouterState state) => const ProfileScreen();
}

class AppScaffold extends StatelessWidget {
  const AppScaffold({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) => Scaffold(
        body: navigationShell,
        bottomNavigationBar: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (index) => navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          ),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
            NavigationDestination(icon: Icon(Icons.receipt_long), label: 'Orders'),
            NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
          ],
        ),
      );
}
```

Create and register one global router from the generated routes: `final appRouter = GoRouter(routes: $appRoutes);`. Navigate with route objects, such as `const OrdersRoute().go(context)` and `OrderDetailRoute(orderId: id).push(context)`, rather than raw paths or `context.go` strings.

