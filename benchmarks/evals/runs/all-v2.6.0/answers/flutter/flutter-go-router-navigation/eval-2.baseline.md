Put access control in the router's top-level `redirect`. The redirect should be synchronous and side-effect free: it decides the destination from current authentication state and the requested location. Configure `refreshListenable` so the router reevaluates the redirect when sign-in state changes.

```dart
class AuthController extends ChangeNotifier {
  bool _isSignedIn = false;
  bool get isSignedIn => _isSignedIn;

  void signIn() {
    _isSignedIn = true;
    notifyListeners();
  }

  void signOut() {
    _isSignedIn = false;
    notifyListeners();
  }
}

final auth = AuthController();

final router = GoRouter(
  initialLocation: '/',
  refreshListenable: auth,
  redirect: (context, state) {
    const protectedPaths = {'/cart', '/checkout'};
    final requestedPath = state.uri.path;
    final needsAuth = protectedPaths.contains(requestedPath);
    final onLogin = requestedPath == '/login';

    if (!auth.isSignedIn && needsAuth) {
      final returnTo = Uri.encodeComponent(state.uri.toString());
      return '/login?from=$returnTo';
    }

    // Avoid leaving an authenticated user on the login screen.
    if (auth.isSignedIn && onLogin) {
      final from = state.uri.queryParameters['from'];
      return from != null && from.startsWith('/') ? from : '/';
    }

    return null;
  },
  routes: [
    GoRoute(path: '/', builder: (_, __) => const HomePage()),
    GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
    GoRoute(path: '/cart', builder: (_, __) => const CartPage()),
    GoRoute(path: '/checkout', builder: (_, __) => const CheckoutPage()),
  ],
);
```

After a successful login, call `auth.signIn()`. The notification causes `go_router` to rerun `redirect` and return the user to the saved internal path. In a production app, expose only trusted authentication state through the controller and validate authorization again when fetching or mutating checkout data; a client redirect is navigation UX, not a security boundary. For nested protected routes, either enumerate their paths or use a route-level redirect/prefix check such as `requestedPath.startsWith('/checkout/')`.

