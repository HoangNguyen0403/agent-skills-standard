Use `ref.listen` (or `WidgetRef.listen` in a widget) to react to provider state changes and run the navigation there, not inside `build`.

Example:

```dart
ref.listen<AuthState>(authProvider, (previous, next) {
  if (next.isLoggedIn) {
    Navigator.of(context).pushReplacementNamed('/home');
  }
});
```

This keeps side effects separate from UI rendering and avoids triggering navigation during rebuilds.

