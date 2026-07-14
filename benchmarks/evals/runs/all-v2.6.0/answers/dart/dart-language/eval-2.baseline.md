Use a `sealed` hierarchy and pattern matching in a `switch` expression or `switch` statement. In modern Dart, exhaustiveness checking works when the compiler knows the full closed set of subtypes.

Example:

```dart
sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);
}

final class Failure<T> extends Result<T> {
  final String message;
  const Failure(this.message);
}
```

Now switch on `Result<T>`:

```dart
String describe(Result<int> result) {
  return switch (result) {
    Success(value: final value) => 'Success: $value',
    Failure(message: final message) => 'Failure: $message',
  };
}
```

Why this works:

- `sealed` tells Dart that all direct subtypes are known at compile time.
- Because the compiler knows the closed set of cases, it can check whether your `switch` is exhaustive.
- If you later add another subtype, such as `Loading<T>`, the compiler will flag every non-exhaustive switch.

Important details:

1. Put the subtypes in the same library as the sealed base type, or otherwise structure the code so the sealed restriction is preserved.
2. Switch on the sealed base type (`Result<T>`), not on `Object` or `dynamic`, or you lose exhaustiveness.
3. Avoid a default case (`_ => ...`) if your goal is compiler enforcement. A catch-all can silence the missing-case signal.

For example, this weakens the benefit:

```dart
switch (result) {
  case Success(value: final value):
    return 'Success: $value';
  default:
    return 'Something else';
}
```

That compiles, but now the compiler is not forcing you to explicitly handle every subtype.

If you prefer a statement form instead of an expression:

```dart
void handle(Result<int> result) {
  switch (result) {
    case Success(value: final value):
      print('Success: $value');
    case Failure(message: final message):
      print('Failure: $message');
  }
}
```

So the short answer is: define `Result` as `sealed`, model each variant as a subtype, and use pattern matching in a switch without a default branch.

