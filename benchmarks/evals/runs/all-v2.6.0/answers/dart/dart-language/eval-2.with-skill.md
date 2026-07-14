Make the base type a `sealed class`, then switch on it using pattern matching.

In Dart, `sealed` tells the compiler that all subclasses must be known within the same library. That lets a `switch` become exhaustiveness-checked: if you forget one subtype, the compiler can flag it.

Example:

```dart
sealed class Result {}

final class Success extends Result {
  const Success(this.value);
  final String value;
}

final class Failure extends Result {
  const Failure(this.message);
  final String message;
}

String describe(Result result) => switch (result) {
  Success(value: final value) => 'Success: $value',
  Failure(message: final message) => 'Failure: $message',
};
```

Why this works:

- `sealed class Result` restricts subclassing to the same library.
- The compiler knows the full set of possible subtypes.
- A `switch` expression or `switch` statement over `Result` must cover all cases.

If you later add another subtype, for example:

```dart
final class Loading extends Result {
  const Loading();
}
```

then the existing switch is no longer exhaustive, and Dart will force you to handle `Loading` too. That is exactly the compiler protection you want.

This is the modern Dart 3 pattern for domain states:

- `sealed class` for closed hierarchies
- pattern matching in `switch`
- subtype field destructuring directly in each case

That combination gives you safer refactors and removes the need for fragile `if (result is Success)` chains.

