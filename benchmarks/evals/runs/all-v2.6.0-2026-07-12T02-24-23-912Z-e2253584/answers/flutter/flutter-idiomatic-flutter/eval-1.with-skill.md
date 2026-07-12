`setState` must not run after the widget has been disposed. Any `await` is an async gap: the user may navigate away while the operation is running. Check `context.mounted` immediately after the await and before every later use of the context or state.

```dart
Future<void> _saveProfile() async {
  setState(() => _isSaving = true);

  try {
    await repository.save(_draft);
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profile saved')),
    );
  } catch (error) {
    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Save failed: $error')),
    );
  } finally {
    if (context.mounted) {
      setState(() => _isSaving = false);
    }
  }
}
```

Do not use `mounted` as a one-time check before the `await`; it must be checked after the gap. If this operation belongs to application state rather than local presentation state, move it into a BLoC or Riverpod notifier and let the widget render that state. That also avoids a widget owning a long-lived controller or operation.

