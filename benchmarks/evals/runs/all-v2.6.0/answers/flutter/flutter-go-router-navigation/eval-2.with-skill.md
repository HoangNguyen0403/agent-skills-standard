Put authentication policy on the single root `GoRouter` through its `redirect` callback. Pages should render their UI only; they must not redirect from `build`.

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

part 'app_router.g.dart';

abstract interface class AuthSession {
  bool get isLoggedIn;
}

@TypedGoRoute<LoginRoute>(path: '/login')
class LoginRoute extends GoRouteData {
  const LoginRoute({this.from});

  final String? from;

  @override
  Widget build(BuildContext context, GoRouterState state) => const LoginScreen();
}

@TypedGoRoute<CartRoute>(path: '/cart')
class CartRoute extends GoRouteData {
  const CartRoute();

  @override
  Widget build(BuildContext context, GoRouterState state) => const CartScreen();
}

@TypedGoRoute<CheckoutRoute>(path: '/checkout')
class CheckoutRoute extends GoRouteData {
  const CheckoutRoute();

  @override
  Widget build(BuildContext context, GoRouterState state) => const CheckoutScreen();
}

GoRouter createAppRouter(AuthSession auth) => GoRouter(
      routes: $appRoutes,
      redirect: (context, state) {
        final protectedLocations = {'/cart', '/checkout'};
        final needsAuth = protectedLocations.contains(state.uri.path);
        final onLogin = state.uri.path == '/login';

        if (!auth.isLoggedIn && needsAuth) {
          return LoginRoute(from: state.uri.toString()).location;
        }
        if (auth.isLoggedIn && onLogin) {
          return state.uri.queryParameters['from'] ?? const CartRoute().location;
        }
        return null;
      },
    );
```

After the login state changes, notify the router so it re-evaluates redirection (for example, supply an auth `ChangeNotifier` as `refreshListenable`, or a stream with `GoRouterRefreshStream`). Navigation remains typed: `const CartRoute().go(context)` and `const CheckoutRoute().push(context)`. If `from` can point outside the app, validate or constrain it before using it to avoid open redirects.

