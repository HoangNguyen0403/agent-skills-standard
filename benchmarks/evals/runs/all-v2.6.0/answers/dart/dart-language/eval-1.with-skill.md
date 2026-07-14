Use a Dart record.

For a lightweight “success value + error message” return without introducing a custom class, the modern Dart 3 approach is to return a record and destructure it at the call site. Prefer named fields when the meaning of each value matters.

Example:

```dart
(String? data, String? error) parseUsername(String input) {
  if (input.trim().isEmpty) {
    return (data: null, error: 'Username cannot be empty');
  }

  return (data: input.trim(), error: null);
}

void main() {
  final (:data, :error) = parseUsername('alice');

  if (error != null) {
    print(error);
    return;
  }

  print('Parsed user: $data');
}
```

Why this is the idiomatic choice:

- Records are built into Dart 3, so they are ideal for simple multi-value returns.
- Named fields make the API easier to read than positional values like `(String?, String?)`.
- Destructuring keeps usage concise and avoids repetitive indexing or temporary variables.

A useful rule of thumb:

- Use a record when the return shape is small and local.
- Use a custom type when the result has behavior, many fields, or is reused across the codebase.

If you want to make the intent even clearer, you can define a typedef:

```dart
typedef ParseResult = ({String? data, String? error});

ParseResult parseUsername(String input) {
  if (input.trim().isEmpty) {
    return (data: null, error: 'Username cannot be empty');
  }

  return (data: input.trim(), error: null);
}
```

That gives you the convenience of records while keeping the return contract self-documenting.

