The modern Dart way is to return a record instead of inventing a tiny one-off class.

For example, if you want either a value or an error message, you can return a record with named fields:

```dart
(int? value, String? error) parsePort(String input) {
  final port = int.tryParse(input);
  if (port == null) {
    return (value: null, error: 'Invalid port number');
  }
  return (value: port, error: null);
}
```

Usage:

```dart
final result = parsePort('8080');

if (result.value != null) {
  print('Parsed: ${result.value}');
} else {
  print('Error: ${result.error}');
}
```

Why this is considered modern Dart:

- Records are built into the language, so you do not need a dedicated wrapper class for simple multi-value returns.
- Named fields make the return shape self-documenting.
- It is lightweight and good for local helpers or simple APIs.

That said, there is an important design point: a record like `(T? value, String? error)` does not enforce correctness very strongly. Nothing stops a bug from returning both fields as non-null or both as null. So this is convenient, but not always the best model.

If the function represents a real success/failure domain concept, a sealed `Result` type is often safer:

```dart
sealed class Result<T> {
  const Result();
}

class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);
}

class Failure<T> extends Result<T> {
  final String message;
  const Failure(this.message);
}
```

That approach gives you stronger invariants and better exhaustive pattern matching. But if your goal is specifically “return two related values without creating a custom class,” records are the idiomatic modern Dart answer.

Practical rule of thumb:

- Use a record for simple, local, low-ceremony returns.
- Use a sealed `Result` type when success vs failure is part of the API contract and you want compiler help.

