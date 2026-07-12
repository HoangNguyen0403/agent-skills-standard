Yes, often you can make it more idiomatic Dart.

If the loop is only:

- filtering items
- transforming them
- collecting the result

then a pipeline with `where`, `map`, and `toList` is usually clearer than manually pushing into a list.

For example, instead of:

```dart
List<String> activeNames(List<User> users) {
  final result = <String>[];

  for (final user in users) {
    if (user.isActive) {
      result.add(user.name.trim());
    }
  }

  return result;
}
```

prefer:

```dart
List<String> activeNames(List<User> users) => users
    .where((user) => user.isActive)
    .map((user) => user.name.trim())
    .toList();
```

This is more idiomatic because it:

- expresses intent directly
- avoids mutable accumulation
- keeps the transformation local and readable

A few style rules matter here too:

- use `final` for locals unless reassignment is needed
- use `var` only when the type is extremely obvious in a tiny scope
- type empty collections like `<String>[]` if you do need one
- prefer expression-bodied methods for single-expression utilities

You can go further with Dart collection features when appropriate:

```dart
List<String> activeNames(List<User> users) => [
      for (final user in users)
        if (user.isActive) user.name.trim(),
    ];
```

That version is also idiomatic and can be easier to read when the logic is simple.

Use whichever is clearer:

- `where().map().toList()` for standard collection pipelines
- collection `for`/`if` when you want inline list construction

Keep the loop if the method has side effects, branching, async control flow, or early exits that would become harder to understand in a chain. Idiomatic Dart is about clarity first, not forcing a functional style everywhere.

