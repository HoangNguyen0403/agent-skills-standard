Yes. In idiomatic Dart, a utility method that manually loops over a collection to filter and transform items can often be expressed more clearly with collection methods such as `where`, `map`, and `toList`.

Instead of this style:

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

Prefer this:

```dart
List<String> activeNames(List<User> users) {
  return users
      .where((user) => user.isActive)
      .map((user) => user.name.trim())
      .toList();
}
```

Why this is more idiomatic:

- It expresses intent directly: filter first, then transform.
- It avoids manual list mutation when a pipeline is enough.
- It reduces boilerplate and makes the function easier to scan.

That said, do not force chaining if it hurts readability. A `for` loop is still fine when:

- the logic has several branches,
- you need early exits,
- you are building multiple outputs at once,
- or the transformation is stateful and easier to understand imperatively.

Good Dart style is not “never use loops”; it is “prefer the clearest expression of the intent.” For simple filter-and-map work, collection pipelines are usually the best choice.

