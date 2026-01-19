# Navigator v1: Centralized onGenerateRoute

Using an abstract class for route names and a centralized router for navigation logic.

```dart
// route_names.dart
abstract class Routes {
  static const home = '/';
  static const details = '/details';
}

// app_router.dart
class AppRouter {
  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case Routes.home:
        return MaterialPageRoute(builder: (_) => const HomeScreen());

      case Routes.details:
        // Safe argument extraction
        final args = settings.arguments;
        if (args is int) {
          return MaterialPageRoute(
            builder: (_) => DetailScreen(id: args),
          );
        }
        return _errorRoute();

      default:
        return _errorRoute();
    }
  }

  static Route<dynamic> _errorRoute() {
    return MaterialPageRoute(
      builder: (_) => const Scaffold(body: Center(child: Text('Error'))),
    );
  }
}

// main.dart
MaterialApp(
  onGenerateRoute: AppRouter.onGenerateRoute,
)

// Usage
Navigator.pushNamed(context, Routes.details, arguments: 42);
```
