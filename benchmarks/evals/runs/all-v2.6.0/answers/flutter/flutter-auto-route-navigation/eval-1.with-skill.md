Use an `AutoRouteGuard` on the cart route so the routing layer, not the UI, enforces authentication. In `auto_route`, the guard can check auth state and redirect unauthenticated users to `LoginRoute()`.

```dart
import 'package:auto_route/auto_route.dart';

class AuthGuard extends AutoRouteGuard {
  final AuthService authService;

  AuthGuard(this.authService);

  @override
  void onNavigation(NavigationResolver resolver, StackRouter router) {
    final isLoggedIn = authService.isLoggedIn;

    if (isLoggedIn) {
      resolver.next(true);
      return;
    }

    router.push(
      LoginRoute(
        onLoginResult: (success) {
          if (success) {
            resolver.next(true);
          } else {
            resolver.next(false);
          }
        },
      ),
    );
  }
}
```

Then attach the guard to the cart route in your router configuration:

```dart
@AutoRouterConfig()
class AppRouter extends _$AppRouter {
  AppRouter(this.authGuard);

  final AuthGuard authGuard;

  @override
  List<AutoRoute> get routes => [
    AutoRoute(page: HomeRoute.page, initial: true),
    AutoRoute(page: LoginRoute.page),
    AutoRoute(
      page: CartRoute.page,
      guards: [authGuard],
    ),
  ];
}
```

Make sure the cart page is annotated so `auto_route` generates the typed route:

```dart
@RoutePage()
class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: Text('Cart')),
    );
  }
}
```

Why this is the right pattern:

- It keeps navigation type-safe by using `CartRoute()` and `LoginRoute()` instead of route-name strings.
- It protects the route centrally in the router, so every entry path to the cart is covered.
- It avoids putting navigation logic in BLoC or business logic layers.

If you want to return the user to the cart automatically after login, pass the pending intent through the login flow and call `resolver.next(true)` only after successful authentication.

