---
name: Flutter Navigator v1 (Imperative)
description: Standard Flutter navigation using Navigator 1.0 (push/pop).
metadata:
  labels: [navigation, navigator, flutter-core]
  triggers:
    files: ['**/app.dart']
    keywords: [Navigator, push, pop, MaterialPageRoute, onGenerateRoute]
---

# Navigator v1 Navigation

## **Priority: P0 (CRITICAL)**

Standard imperative navigation system built into Flutter using `Navigator` and `MaterialPageRoute`.

## Implementation Guidelines

- **Standard Push**: Use `Navigator.of(context).push(MaterialPageRoute(builder: (_) => Screen()))`.
- **Named Routes**: Define `routes` map in `MaterialApp` or use `onGenerateRoute` for dynamic routing.
- **Passing Arguments**:
  - For named routes: Use `Navigator.pushNamed(context, '/path', arguments: data)`.
  - For `onGenerateRoute`: Extract arguments using `settings.arguments`.
- **Returning Data**: `final result = await Navigator.push(...)` and `Navigator.pop(context, data)`.
- **Replacing Screens**: Use `pushReplacement` or `pushAndRemoveUntil` for auth/splash flows.

## Code Example

```dart
// Basic Push
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => const DetailScreen()),
);

// Named Routes Configuration
MaterialApp(
  initialRoute: '/',
  onGenerateRoute: (settings) {
    if (settings.name == '/details') {
      final args = settings.arguments as Map;
      return MaterialPageRoute(
        builder: (context) => DetailScreen(id: args['id']),
      );
    }
    return null;
  },
);

// Navigation with Arguments
Navigator.pushNamed(
  context,
  '/details',
  arguments: {'id': 123},
);
```

## Anti-Patterns

- **Deep Nesting**: Avoid anonymous routes for complex apps; use `onGenerateRoute`.
- **Manual String Paths**: Always use constants for route names.
- **Context Leaks**: Ensure `BuildContext` is valid when calling `Navigator.of(context)`. Use `ScaffoldMessenger` or global keys if navigation is needed outside `build`.

## Reference & Examples

For centralized `onGenerateRoute` implementation:
See [references/on-generate-route.md](references/on-generate-route.md).

## Related Topics

idiomatic-flutter | widgets
