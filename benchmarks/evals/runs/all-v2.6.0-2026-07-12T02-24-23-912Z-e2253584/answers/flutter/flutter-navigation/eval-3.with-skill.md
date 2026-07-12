Use `go_router` redirect logic on the cart route so unauthenticated users are sent to login before the page builds.

```dart
class Routes {
  static const login = '/login';
  static const cart = '/cart';
}

final goRouter = GoRouter(
  redirect: (context, state) {
    final loggedIn = context.read<AuthCubit>().state.isAuthenticated;
    final goingToCart = state.matchedLocation == Routes.cart;

    if (!loggedIn && goingToCart) {
      return Routes.login;
    }

    return null;
  },
  routes: [
    GoRoute(
      path: Routes.login,
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: Routes.cart,
      builder: (context, state) => const CartScreen(),
    ),
  ],
);
```

This keeps auth enforcement in the router, avoids hardcoded route checks outside navigation, and ensures guests are redirected to the login screen whenever they try to open the cart route.

