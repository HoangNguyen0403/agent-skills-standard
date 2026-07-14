`setState()` must not run after the `State` object has been disposed. Any asynchronous callback can complete after the user navigates away, so check that the widget is still mounted immediately before updating state.

```dart
Future<void> loadProfile() async {
  setState(() => _isLoading = true);

  try {
    final profile = await repository.fetchProfile();
    if (!mounted) return;
    setState(() => _profile = profile);
  } catch (error) {
    if (!mounted) return;
    setState(() => _error = error);
  } finally {
    if (!mounted) return;
    setState(() => _isLoading = false);
  }
}
```

For streams, timers, animation controllers, and other subscriptions, cancel or dispose them in `dispose()` as well. Avoid retaining a `BuildContext` or calling navigation/UI updates from a callback unless the widget is still mounted. When using `BuildContext` after an `await`, use `if (!context.mounted) return;` before accessing it.

