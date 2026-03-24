# Navigation Implementation Examples

## Route Configuration

```dart
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/orders/:id',
      redirect: (context, state) {
        final id = state.pathParameters['id'];
        if (id == null || id.isEmpty) return '/';
        return null;
      },
      builder: (context, state) => OrderDetailScreen(
        id: state.pathParameters['id']!,
      ),
    ),
  ],
);
```
