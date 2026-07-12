Use an `AutoRouteGuard` and attach it to the cart route. The guard checks whether the user is signed in; if yes, allow navigation, otherwise send the user to login and stop the original navigation.

Example:

```dart
class AuthGuard extends AutoRouteGuard {
  final AuthService authService;

  AuthGuard(this.authService);

  @override
  void onNavigation(NavigationResolver resolver, StackRouter router) {
    if (authService.isLoggedIn) {
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

Attach the guard to the cart page:

```dart
@AutoRouterConfig()
class AppRouter extends RootStackRouter {
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

Key idea:

- `resolver.next(true)` continues to the cart.
- `resolver.next(false)` cancels navigation.
- Redirect to `LoginRoute` when not authenticated.

If you want the user to return to the cart automatically after login, complete the pending resolver after successful login as shown above. That is the usual `auto_route` pattern for protected pages.

