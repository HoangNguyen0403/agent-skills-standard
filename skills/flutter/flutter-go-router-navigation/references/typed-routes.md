# GoRouter Typed Routes + Redirect

```dart
// Route Definition
@TypedGoRoute<HomeRoute>(path: '/')
class HomeRoute extends GoRouteData {
  @override
  Widget build(context, state) => const HomePage();
}

// Router Config
final router = GoRouter(
  routes: $appRoutes,
  redirect: (context, state) {
    if (notAuthenticated) return '/login';
    return null;
  },
);
```
